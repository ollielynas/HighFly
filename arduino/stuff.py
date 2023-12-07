import serial

with serial.Serial('COM4') as ser:
    with open('data.txt', 'wb') as f:
        while 2:
            f.write(ser.read_all())

