/**
 * Blynk HTTP REST API Service
 * Documentation: https://docs.blynk.io/en/blynk.cloud/http-rest-api
 */

export async function getBlynkPinValue(pin: string) {
  try {
    const response = await fetch(`/api/blynk/get?pin=${pin}`);
    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    console.error('Blynk API Error:', error);
    return null;
  }
}

export async function updateBlynkPinValue(pin: string, value: string) {
  try {
    const response = await fetch(`/api/blynk/update?pin=${pin}&value=${value}`);
    return response.ok;
  } catch (error) {
    console.error('Blynk API Error:', error);
    return false;
  }
}

export async function triggerN8NWebhook(data: any) {
  try {
    // Use local proxy to avoid CORS issues and hide URL
    const response = await fetch('/api/n8n-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return response.ok;
  } catch (error) {
    console.error('n8n Webhook Error:', error);
    return false;
  }
}
