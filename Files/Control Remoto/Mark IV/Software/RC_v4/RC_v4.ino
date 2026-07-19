//********************************************************
//            Control Remoto con NRF24 (Cliente)
//********************************************************

#include <SPI.h>
#include <RH_NRF24.h>
#include <LowPower.h>

//Conexiones
#define BTN_PIN_1 2
#define BTN_PIN_2 3
#define CE_PIN 7
#define CSN_PIN 8

//Debug LED
#define DEBUG_LED 4

//Constantes
#define KBPS_250 (RH_NRF24::DataRate250kbps)
#define MBPS_1   (RH_NRF24::DataRate1Mbps)
#define MBPS_2   (RH_NRF24::DataRate2Mbps)
#define PW_0DB   (RH_NRF24::TransmitPower0dBm)
#define MAX_MSG_LEN (RH_NRF24_MAX_MESSAGE_LEN)

RH_NRF24 nrf24(CE_PIN, CSN_PIN);

//Variables de estado botones
bool btn_pressed_1 = false;
bool btn_pressed_2 = false;

//Setup
void setup(void) 
{
 //Init Button
  pinMode(BTN_PIN_1, INPUT);
  pinMode(BTN_PIN_2, INPUT);

  //Init DEBUG LED
  pinMode(DEBUG_LED, OUTPUT);

  //ISR for BTN1 IRQ
  attachInterrupt(digitalPinToInterrupt(BTN_PIN_1), btn_event_1, RISING);

  //ISR for BTN2 IRQ
  attachInterrupt(digitalPinToInterrupt(BTN_PIN_2), btn_event_2, RISING);

  //Init NRF24 
  if (!nrf24.init())
    digitalWrite(DEBUG_LED, HIGH);
    
  //Set Channel  
  if (!nrf24.setChannel(2))
    digitalWrite(DEBUG_LED, HIGH);

  //RF Settings
  if (!nrf24.setRF(KBPS_250, PW_0DB))
    digitalWrite(DEBUG_LED, HIGH);
}

//ISR BTN 1
void btn_event_1(void) 
{
  btn_pressed_1 = true;
}

//ISR BTN 2
void btn_event_2(void) 
{
  btn_pressed_2 = true;
}

//Send data via NRF24
void enviarBTN(const char *msg) 
{
  nrf24.setModeTx();
  delay(100); //Wait for wake up

  //Send Message
  uint8_t data[5];
  strncpy((char*)data, msg, sizeof(data));
  nrf24.send(data, sizeof(data));
  nrf24.waitPacketSent();
}

//Loop
void loop(void) 
{
  if (btn_pressed_1 == true) 
  {
    btn_pressed_1 = false;
    enviarBTN("BTN1");
  }

  if (btn_pressed_2 == true) 
  {
    btn_pressed_2 = false;
    enviarBTN("BTN2");
  }

  //Sleep Nano and NRF24 until Watchdog or external interrupt
  nrf24.sleep();
  LowPower.powerDown(SLEEP_60MS, ADC_OFF, BOD_OFF);   //SLEEP_30MS, SLEEP_60MS, SLEEP_120MS
}

