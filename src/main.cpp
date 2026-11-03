#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>

// ===== Configurações =====
#define WIFI_SSID "uaifai-tiradentes"
#define WIFI_PASS "bemvindoaocesar"
#define MQTT_SERVER "172.26.66.249"
#define MQTT_PORT 1883
#define MQTT_TOPIC "silo/dados"

#define ONE_WIRE_BUS 4
#define DHT_PIN 15
#define DHT_TYPE DHT11

// ===== Objetos =====
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient espClient;
PubSubClient mqtt(espClient);

// ===== Variáveis globais (protegidas por mutex) =====
volatile float tempGrao = 0.0;
volatile bool tempGraoValida = false;
volatile float tempAr = 0.0;
volatile float umidAr = 0.0;
volatile bool dhtValido = false;

SemaphoreHandle_t mutexDados;

// ===== Task DS18B20 (Core 1) =====
void taskDS18B20(void *pvParameters) {
    sensors.begin();
    
    int numSensores = sensors.getDeviceCount();
    Serial.print("DS18B20 encontrados: ");
    Serial.println(numSensores);
    
    while (1) {
        sensors.requestTemperatures();
        float tempC = sensors.getTempCByIndex(0);
        
        if (tempC != DEVICE_DISCONNECTED_C) {
            xSemaphoreTake(mutexDados, portMAX_DELAY);
            tempGrao = tempC;
            tempGraoValida = true;
            xSemaphoreGive(mutexDados);
        }
        
        vTaskDelay(pdMS_TO_TICKS(2000));
    }
}

// ===== Task DHT11 (Core 1) =====
void taskDHT(void *pvParameters) {
    dht.begin();
    vTaskDelay(pdMS_TO_TICKS(2000)); // DHT11 precisa de tempo para estabilizar
    
    while (1) {
        float t = dht.readTemperature();
        float h = dht.readHumidity();
        
        if (!isnan(t) && !isnan(h)) {
            xSemaphoreTake(mutexDados, portMAX_DELAY);
            tempAr = t;
            umidAr = h;
            dhtValido = true;
            xSemaphoreGive(mutexDados);
        }
        
        vTaskDelay(pdMS_TO_TICKS(2000)); // DHT11: mínimo 2s entre leituras
    }
}

// ===== Task MQTT (Core 0) =====
void taskMQTT(void *pvParameters) {
    // Conecta WiFi
    Serial.print("Conectando WiFi...");
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println(" OK!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    
    mqtt.setServer(MQTT_SERVER, MQTT_PORT);
    
    while (1) {
        if (!mqtt.connected()) {
            Serial.print("Conectando MQTT...");
            if (mqtt.connect("ESP32-Silo")) {
                Serial.println(" OK!");
            } else {
                Serial.println(" Falhou!");
                vTaskDelay(pdMS_TO_TICKS(2000));
                continue;
            }
        }
        mqtt.loop();
        
        // Lê variáveis protegidas
        float tGrao, tAr, uAr;
        bool gOk, dOk;
        xSemaphoreTake(mutexDados, portMAX_DELAY);
        tGrao = tempGrao;
        gOk = tempGraoValida;
        tAr = tempAr;
        uAr = umidAr;
        dOk = dhtValido;
        xSemaphoreGive(mutexDados);
        
        // Monta JSON
        char json[128];
        if (gOk && dOk) {
            snprintf(json, sizeof(json),
                "{\"temp_grao\":%.1f,\"temp_ar\":%.1f,\"umid_ar\":%.0f,\"diferenca\":%.1f}",
                tGrao, tAr, uAr, tGrao - tAr);
            mqtt.publish(MQTT_TOPIC, json);
        } else if (gOk) {
            snprintf(json, sizeof(json), "{\"temp_grao\":%.1f}", tGrao);
            mqtt.publish(MQTT_TOPIC, json);
        } else if (dOk) {
            snprintf(json, sizeof(json),
                "{\"temp_ar\":%.1f,\"umid_ar\":%.0f}", tAr, uAr);
            mqtt.publish(MQTT_TOPIC, json);
        }
        
        vTaskDelay(pdMS_TO_TICKS(2000));
    }
}

// ===== Task Serial (Core 0) =====
void taskSerial(void *pvParameters) {
    while (1) {
        float tGrao, tAr, uAr;
        bool gOk, dOk;
        xSemaphoreTake(mutexDados, portMAX_DELAY);
        tGrao = tempGrao;
        gOk = tempGraoValida;
        tAr = tempAr;
        uAr = umidAr;
        dOk = dhtValido;
        xSemaphoreGive(mutexDados);
        
        Serial.print("Grao: ");
        if (gOk) { Serial.print(tGrao, 1); Serial.print("C"); }
        else { Serial.print("--"); }
        
        Serial.print(" | Ar: ");
        if (dOk) {
            Serial.print(tAr, 1); Serial.print("C / ");
            Serial.print(uAr, 0); Serial.print("%");
        } else {
            Serial.print("--");
        }
        
        if (gOk && dOk) {
            Serial.print(" | Dif: ");
            Serial.print(tGrao - tAr, 1);
            Serial.print("C");
        }
        
        Serial.println();
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

// ===== Setup =====
void setup() {
    Serial.begin(115200);
    Serial.println("Silo Monitor - DS18B20 + DHT11 + MQTT + FreeRTOS");
    
    mutexDados = xSemaphoreCreateMutex();
    
    // Core 1: sensores
    xTaskCreatePinnedToCore(taskDS18B20, "DS18B20", 4096, NULL, 2, NULL, 1);
    xTaskCreatePinnedToCore(taskDHT, "DHT11", 4096, NULL, 2, NULL, 1);
    
    // Core 0: comunicação
    xTaskCreatePinnedToCore(taskMQTT, "MQTT", 4096, NULL, 1, NULL, 0);
    xTaskCreatePinnedToCore(taskSerial, "Serial", 4096, NULL, 1, NULL, 0);
}

void loop() {
    vTaskDelay(pdMS_TO_TICKS(1000));
}