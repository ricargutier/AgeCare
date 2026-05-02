CC      := arm-none-eabi-gcc
CFLAGS  := -mcpu=cortex-m33 -mfpu=fpv5-sp-d16 -mfloat-abi=hard \
           -mthumb -O2 -Wall -Wextra -std=c11 \
           -ffunction-sections -fdata-sections \
           -DUSE_FULL_ASSERT
LDFLAGS := -Wl,--gc-sections -nostartfiles
TARGET  := build/wearable.elf
SRCS    := src/main.c src/fall_detection.c src/sos.c src/ble.c
OBJS    := $(patsubst src/%.c,build/%.o,$(SRCS))

.PHONY: all clean flash check-toolchain

all: check-toolchain $(TARGET)

check-toolchain:
	@which $(CC) > /dev/null 2>&1 || { \
	  echo "Skipping firmware build: arm-none-eabi-gcc not installed." \
	       "This is expected on dev machines without the embedded toolchain."; \
	  exit 0; \
	}

$(TARGET): $(OBJS) | build/
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $^
	@echo "Built: $@"

build/%.o: src/%.c | build/
	$(CC) $(CFLAGS) -Isrc -c -o $@ $<

build/:
	mkdir -p build

flash:
	@echo "Not implemented in prototype. Use OpenOCD or a vendor flash tool."

clean:
	rm -rf build/
