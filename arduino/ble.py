import asyncio
from bleak import BleakScanner, BleakClient,BleakGATTCharacteristic
import struct

ADDRESS = "99:60:DC:08:8F:D0"
TARGET_SERVICE = "180C"
JUMPER_CHARACTERISTIC = "00002a56-0000-1000-8000-00805f9b34fb"

last_off_tramp = -1

def callback(sender: BleakGATTCharacteristic, b: bytearray):
    global last_off_tramp
    on_tramp, timestamp = struct.unpack("<?xxxl", b)

    if on_tramp and last_off_tramp != -1:
        print("Time of flight:", timestamp - last_off_tramp)
        
    if not on_tramp:
        last_off_tramp = timestamp

async def run():
    async with BleakClient(ADDRESS) as client:
        print("Connected")

        for service in await client.get_services():
            print("Service", service)
            for char in service.characteristics:
                print(" -", char.uuid)

        await client.start_notify(JUMPER_CHARACTERISTIC, callback)

        while client.is_connected:
            await asyncio.sleep(1)

loop = asyncio.get_event_loop()
loop.run_until_complete(run())