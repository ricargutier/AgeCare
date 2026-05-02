// AgeCare Hub — BLE-to-WebSocket bridge
//
// Reads BACKEND_URL from the environment (default: ws://localhost:3000).
// Authenticates with the backend via HUB_TOKEN (default: hub-token-eleanor).
//
// Behaviour:
//   - Connects (with reconnect) to /ws/ingest?deviceToken=<HUB_TOKEN>
//   - Runs a stub BLE listener loop (ScanForWearable + Subscribe) that
//     simulates one heartbeat per minute from the hub device itself
//   - Buffers frames in a 1000-entry in-memory ring buffer for offline
//     resilience; drains the buffer when the WebSocket is connected
//   - On SIGINT/SIGTERM: drains remaining buffered frames with a 5 s timeout
//     then exits cleanly

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"os"
	"os/signal"
	"syscall"
	"time"

	// stdlib-only WebSocket: use golang.org/x/net/websocket or a raw HTTP upgrade.
	// We use a minimal hand-rolled client to avoid external dependencies.
	"bufio"
	"crypto/rand"
	"encoding/base64"
	"net"
	"net/http"
)

// ─── Configuration ────────────────────────────────────────────────────────────

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

const (
	hubDeviceID     = "hub-eleanor"
	reconnectDelay  = 5 * time.Second
	heartbeatPeriod = 60 * time.Second
	drainTimeout    = 5 * time.Second
)

// ─── Minimal stdlib WebSocket client ──────────────────────────────────────────
// A production hub would use nhooyr.io/websocket or gorilla/websocket.
// We hand-roll just enough to send JSON text frames without external deps.

type wsConn struct {
	conn net.Conn
	rw   *bufio.ReadWriter
}

func wsHandshakeKey() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return base64.StdEncoding.EncodeToString(b)
}

func dialWS(rawURL string) (*wsConn, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("parse url: %w", err)
	}

	host := u.Host
	if u.Port() == "" {
		if u.Scheme == "wss" {
			host += ":443"
		} else {
			host += ":80"
		}
	}

	conn, err := net.DialTimeout("tcp", host, 10*time.Second)
	if err != nil {
		return nil, fmt.Errorf("dial %s: %w", host, err)
	}

	rw := bufio.NewReadWriter(bufio.NewReader(conn), bufio.NewWriter(conn))

	path := u.RequestURI()
	key := wsHandshakeKey()
	req := fmt.Sprintf(
		"GET %s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"+
			"Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n",
		path, u.Host, key,
	)
	if _, err := fmt.Fprint(rw, req); err != nil {
		conn.Close()
		return nil, fmt.Errorf("write handshake: %w", err)
	}
	if err := rw.Flush(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("flush handshake: %w", err)
	}

	resp, err := http.ReadResponse(rw.Reader, &http.Request{Method: "GET"})
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("read handshake response: %w", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusSwitchingProtocols {
		conn.Close()
		return nil, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	return &wsConn{conn: conn, rw: rw}, nil
}

// sendText sends a WebSocket text frame (RFC 6455 §5).
// Masking is required for client→server frames.
func (c *wsConn) sendText(msg []byte) error {
	mask := make([]byte, 4)
	if _, err := rand.Read(mask); err != nil {
		return err
	}

	// Mask the payload
	masked := make([]byte, len(msg))
	for i, b := range msg {
		masked[i] = b ^ mask[i%4]
	}

	header := []byte{0x81} // FIN + opcode text
	plen := len(msg)
	switch {
	case plen <= 125:
		header = append(header, byte(plen|0x80)) // MASK bit set
	case plen <= 65535:
		header = append(header, 0xFE, byte(plen>>8), byte(plen))
	default:
		header = append(header, 0xFF,
			byte(plen>>56), byte(plen>>48), byte(plen>>40), byte(plen>>32),
			byte(plen>>24), byte(plen>>16), byte(plen>>8), byte(plen),
		)
	}
	header = append(header, mask...)

	if _, err := c.rw.Write(header); err != nil {
		return err
	}
	if _, err := c.rw.Write(masked); err != nil {
		return err
	}
	return c.rw.Flush()
}

func (c *wsConn) close() {
	c.conn.Close()
}

// ─── IngestFrame (hub subset) ──────────────────────────────────────────────────

type heartbeatPayload struct {
	BatteryPct *int `json:"batteryPct,omitempty"`
}

type ingestFrame struct {
	Type     string      `json:"type"`
	DeviceID string      `json:"deviceId"`
	Payload  interface{} `json:"payload"`
}

// ─── Hub bridge ───────────────────────────────────────────────────────────────

type bridge struct {
	backendURL string
	hubToken   string
	buf        *RingBuffer
	ws         *wsConn
}

func newBridge(backendURL, hubToken string) *bridge {
	return &bridge{
		backendURL: backendURL,
		hubToken:   hubToken,
		buf:        &RingBuffer{},
	}
}

func (b *bridge) wsURL() string {
	return fmt.Sprintf("%s/ws/ingest?deviceToken=%s",
		b.backendURL, url.QueryEscape(b.hubToken))
}

// connect (re)connects to the backend WebSocket.  Blocks until connected.
func (b *bridge) connect(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		log.Printf("[hub] Connecting to %s", b.wsURL())
		ws, err := dialWS(b.wsURL())
		if err != nil {
			log.Printf("[hub] Connection failed: %v — retrying in %s", err, reconnectDelay)
			select {
			case <-ctx.Done():
				return
			case <-time.After(reconnectDelay):
			}
			continue
		}
		b.ws = ws
		log.Println("[hub] Connected to backend.")
		return
	}
}

// send marshals a frame and sends it. On failure, the frame is pushed to the
// ring buffer and the connection is closed (triggering reconnect).
func (b *bridge) send(frame ingestFrame) {
	data, err := json.Marshal(frame)
	if err != nil {
		log.Printf("[hub] Marshal error: %v", err)
		return
	}
	if b.ws == nil {
		b.buf.Push(data)
		return
	}
	if err := b.ws.sendText(data); err != nil {
		log.Printf("[hub] Send error: %v — buffering frame", err)
		b.buf.Push(data)
		b.ws.close()
		b.ws = nil
		return
	}
	log.Printf("[hub] Sent frame: %s", string(data))
}

// drain sends all buffered frames. Used at startup and on graceful shutdown.
func (b *bridge) drain(timeout time.Duration) {
	deadline := time.Now().Add(timeout)
	for b.buf.Len() > 0 && time.Now().Before(deadline) {
		raw, ok := b.buf.Pop()
		if !ok {
			break
		}
		if b.ws == nil {
			b.buf.Push(raw) // re-buffer; can't send
			break
		}
		if err := b.ws.sendText(raw); err != nil {
			log.Printf("[hub] Drain send error: %v", err)
			b.buf.Push(raw)
			break
		}
		log.Printf("[hub] Drained buffered frame (%d remaining)", b.buf.Len())
	}
}

// ─── Main ──────────────────────────────────────────────────────────────────────

func main() {
	backendURL := getenv("BACKEND_URL", "ws://localhost:3000")
	hubToken := getenv("HUB_TOKEN", "hub-token-eleanor")

	log.Printf("[hub] Starting AgeCare Hub bridge. BACKEND_URL=%s", backendURL)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	b := newBridge(backendURL, hubToken)

	// Handle SIGINT / SIGTERM
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigCh
		log.Printf("[hub] Received %v — draining buffer and shutting down...", sig)
		cancel()
	}()

	// Initial connection
	b.connect(ctx)

	// Drain anything left in the buffer from a previous crash
	if b.buf.Len() > 0 {
		log.Printf("[hub] Draining %d buffered frames from startup...", b.buf.Len())
		b.drain(drainTimeout)
	}

	// Stub BLE listener
	go func() {
		ScanForWearable()
		Subscribe(hubDeviceID)
	}()

	// Heartbeat ticker — sends one heartbeat per minute from the hub itself
	ticker := time.NewTicker(heartbeatPeriod)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[hub] Shutting down — draining buffer...")
			b.drain(drainTimeout)
			log.Printf("[hub] Shutdown complete (%d frames remaining in buffer).", b.buf.Len())
			return

		case t := <-ticker.C:
			log.Printf("[hub] Sending heartbeat at %s", t.Format(time.RFC3339))
			if b.ws == nil {
				log.Println("[hub] No connection — reconnecting...")
				b.connect(ctx)
				b.drain(drainTimeout)
			}
			b.send(ingestFrame{
				Type:     "heartbeat",
				DeviceID: hubDeviceID,
				Payload:  heartbeatPayload{},
			})
		}
	}
}
