/**
 * Service to handle LLM triage requests with robust error handling, 
 * exponential backoff retry logic, and fallback categorization.
 */

export async function analyzeCustomerMessage(message, apiKey, retryCount = 2) {
  const FALLBACK_RESULT = {
    category: "General Support",
    priority: "Medium",
    routingQueue: "General Queue",
    summary: message.length > 60 ? message.substring(0, 60) + "..." : message,
    confidence: "Low (Fallback Triggered)",
    isFallback: true
  };

  if (!message || !message.trim()) {
    throw new Error("Message content cannot be empty.");
  }

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      // Replace with your actual LLM endpoint / SDK call (e.g., OpenAI / Gemini API)
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are Relay AI, an expert customer support triage system. Analyze the incoming customer message and return strict JSON with keys: category (Billing, Technical, Account, Feature, General), priority (Low, Medium, High, Urgent), routingQueue, summary, confidence (High, Medium, Low)."
            },
            {
              role: "user",
              content: message
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();
      const parsedContent = JSON.parse(data.choices[0].message.content);
      
      return {
        ...parsedContent,
        isFallback: false
      };

    } catch (error) {
      console.warn(`Triage attempt ${attempt + 1} failed:`, error.message);
      if (attempt === retryCount) {
        console.error("All triage attempts failed. Using fallback categorization.");
        return FALLBACK_RESULT;
      }
      // Exponential backoff wait before retry
      await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
    }
  }
}

export const SAMPLE_QUEUE = [
  { id: 1, text: "My payment failed twice and my subscription was canceled!", category: "Billing", priority: "Urgent", routingQueue: "Billing Tier 2" },
  { id: 2, text: "How do I export my customer analytics to CSV?", category: "Feature", priority: "Low", routingQueue: "Customer Success" },
  { id: 3, text: "The app is throwing a 500 server error every time I try to log in.", category: "Technical", priority: "High", routingQueue: "Engineering Escalations" }
];