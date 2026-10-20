/* AIMDS Velxio ESP32 telemetry publisher
 *
 * Velxio hosted editor: pair velxiogw, then use host.velxio.internal.
 * Velxio Desktop/self-hosted: replace AIMDS_HOST with the host address
 * reachable from the simulator, or keep host.velxio.internal if supported.
 *
 * Required canvas part: DHT22 data pin connected to DHT_PIN.
 * Voltage/current/power remain JSON null until matching sensors are wired and
 * their existing read variables are connected below. No values are fabricated.
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

#define DHT_PIN 4
#define DHT_TYPE DHT22
#define AIMDS_HOST "host.velxio.internal"
#define AIMDS_PORT 8000
#define AIMDS_DEVICE_TOKEN "https://velxio.dev/aathiboopathymi/s5-mini-project-simulation/"
#define AIMDS_DEVICE_ID "VELXIO-ESP32-01"
#define SEND_INTERVAL_MS 2000UL

DHT dht(DHT_PIN, DHT_TYPE);
unsigned long lastSend = 0;

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin("Velxio-GUEST");
  Serial.print("[AIMDS] Connecting to Velxio WiFi");
  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 15000UL) {
    delay(250);
    Serial.print('.');
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[AIMDS] WiFi online, IP=%s gateway=%s RSSI=%d dBm\n",
                  WiFi.localIP().toString().c_str(),
                  WiFi.gatewayIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("[AIMDS] WiFi connection timed out; retrying in loop");
  }
}

void sendReading() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[AIMDS] WiFi offline; reconnecting");
    connectWiFi();
    return;
  }

  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("[AIMDS] DHT22 read failed; no payload sent");
    return;
  }

  // Keep these as JSON null until configured electrical sensors provide data.
  const String payload = String("{\"deviceId\":\"") + AIMDS_DEVICE_ID +
    "\",\"voltage\":null,\"current\":null,\"power\":null,\"temperature\":" +
    String(temperature, 2) + ",\"humidity\":" + String(humidity, 2) +
    ",\"timestamp\":null,\"status\":\"online\",\"connectionStatus\":\"online\"}";

  String url = String("http://") + AIMDS_HOST + ":" + AIMDS_PORT + "/api/telemetry/ingest";
  HTTPClient http;
  http.setConnectTimeout(3000);
  http.setTimeout(5000);
  if (!http.begin(url)) {
    Serial.printf("[AIMDS] HTTP begin failed: %s\n", url.c_str());
    return;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-AIMDS-Device-Token", AIMDS_DEVICE_TOKEN);
  int code = http.POST(payload);
  if (code >= 200 && code < 300) {
    Serial.printf("[AIMDS] Reading sent (%d): T=%.2f C H=%.2f %%\n", code, temperature, humidity);
  } else {
    Serial.printf("[AIMDS] HTTP POST failed code=%d error=%s\n", code, http.errorToString(code).c_str());
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(300);
  dht.begin();
  connectWiFi();
}

void loop() {
  if (millis() - lastSend >= SEND_INTERVAL_MS) {
    lastSend = millis();
    sendReading();
  }
  delay(10);
}
