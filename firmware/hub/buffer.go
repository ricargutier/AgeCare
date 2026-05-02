package main

import (
	"encoding/json"
	"sync"
)

const ringCapacity = 1000

// RingBuffer is a fixed-capacity in-memory queue of raw JSON IngestFrame
// messages. When full it drops the oldest entry (head) to make room for the
// newest (tail). Intended for offline resilience: if the backend WebSocket
// connection drops, frames are buffered here and drained once reconnected.
//
// All methods are safe for concurrent use.
type RingBuffer struct {
	mu   sync.Mutex
	buf  [ringCapacity]json.RawMessage
	head int // index of the oldest entry
	tail int // index where the next write goes
	size int // number of valid entries
}

// Push adds a frame to the buffer. If the buffer is full, the oldest frame
// is silently dropped.
func (r *RingBuffer) Push(frame json.RawMessage) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.size == ringCapacity {
		// Drop oldest
		r.head = (r.head + 1) % ringCapacity
		r.size--
	}
	r.buf[r.tail] = frame
	r.tail = (r.tail + 1) % ringCapacity
	r.size++
}

// Pop removes and returns the oldest frame. ok is false if the buffer is empty.
func (r *RingBuffer) Pop() (frame json.RawMessage, ok bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.size == 0 {
		return nil, false
	}
	frame = r.buf[r.head]
	r.buf[r.head] = nil
	r.head = (r.head + 1) % ringCapacity
	r.size--
	return frame, true
}

// Len returns the current number of buffered frames.
func (r *RingBuffer) Len() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.size
}
