BINARY := bin/hub

.PHONY: all run clean

all:
	go build -o $(BINARY) ./...
	@echo "Built: $(BINARY)"

run: all
	./$(BINARY)

clean:
	rm -rf bin/
