#include <Arduino_LSM9DS1.h>
#include <ArduinoBLE.h>


float x, y, z;
int degreesX = 0;
int degreesY = 0;

struct Data {
  bool onTrampoline;
  long timestamp;
};

BLEService jumperService("180F");
BLECharacteristic jumpEvents("2A56", BLERead | BLENotify, sizeof(Data), true);

void setup() {
  Serial.begin(9600);
  Serial.println("Started");

  pinMode(LED_BUILTIN, OUTPUT);


  if (!IMU.begin()) {
    Serial.println("Failed to initialize IMU!");
    while (1);
  }


  Serial.print("Accelerometer sample rate = ");
  Serial.print(IMU.accelerationSampleRate());
  Serial.println("Hz");

  if (!BLE.begin()) {
    Serial.println("Starting BLE failed!");
    while(1) {}
  }

  BLE.setLocalName("Nano33BLE");

  BLE.setAdvertisedService(jumperService);
  jumperService.addCharacteristic(jumpEvents);
  BLE.addService(jumperService);

  Data base = {false, 0};
  jumpEvents.setValue((const uint8_t*) &base, sizeof(Data));

  BLE.advertise();
  Serial.print("Peripheral Device MAX: ");
  Serial.println(BLE.address());
  Serial.println("Waiting for connections...");

  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
}

const int AVG_SIZE = 10;
float rollingAverage[AVG_SIZE];
float rollingSum = 0;
int rollIdx = 0;

long lastPositiveSpike = 0;
long lastNegativeSpike = 0;

const float POSITIVE_THRESHOLD = 0.5;
const float NEGATIVE_THRESHOLD = -0.5;
const long MIN_TIME = 100;
long start_first_spike = 0.0;
long end_first_spike = 0.0;
long start_second_spike = 0.0;
long end_second_spike = 0.0;

bool spike_2nd = false;
bool onTramp = false;

void updateBluetooth(bool onTramp) {
  Data data = {onTramp, millis()};
  jumpEvents.setValue((const uint8_t*) &data, sizeof(Data));
}

void loop() {
  BLEDevice central = BLE.central();

  if (central) {
    Serial.print("Connected to central MAC: ");
    Serial.println(central.address());

    long measureStart = millis();
    int measureCount = 0;

    while (central.connected()) {
      if (IMU.accelerationAvailable()) {
        IMU.readAcceleration(x, y, z);

        measureCount++;
        if (measureCount == 100) {
          float frequency = 100.0 / (millis() - measureStart) * 1000;
          measureCount = 0;
          measureStart = millis();

          Serial.print("Current Frequency: ");
          Serial.print(frequency);
          Serial.println(" Hz");
        }

        rollingSum -= rollingAverage[(rollIdx) % AVG_SIZE];
        rollingSum += x;


        rollingAverage[(rollIdx++) % AVG_SIZE] = x;


        if (rollIdx >= AVG_SIZE) {
          float avg = rollingSum / AVG_SIZE;

          if (avg > POSITIVE_THRESHOLD) {
            if (millis() - lastPositiveSpike > MIN_TIME) {
              start_first_spike = start_second_spike;
              end_first_spike = end_second_spike;
              spike_2nd = true;

              start_second_spike = millis();

              if (lastNegativeSpike < start_first_spike) {
                if (!onTramp) {
                  onTramp = true;
                  updateBluetooth(true);
                  digitalWrite(LED_BUILTIN, HIGH);
                  Serial.println("ON TRAMPOLINE");
                }
              }
            }

            lastPositiveSpike = millis();
          } else {
            if (spike_2nd) {
              end_second_spike = millis();

              if (lastNegativeSpike > end_first_spike) {
                if (onTramp) {
                  onTramp = false;
                  updateBluetooth(false);
                  digitalWrite(LED_BUILTIN, LOW);
                  Serial.println("OFF TRAMPOLINE");
                }
              }
            }
            spike_2nd = false;
          }

          if (avg < NEGATIVE_THRESHOLD) {
            lastNegativeSpike = millis();
          }
        }
      }
    }

    Serial.print("Disconnected from central MAC: ");
    Serial.println(central.address());
    digitalWrite(LED_BUILTIN, LOW);
  }
}