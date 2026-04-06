const FREEPBX_URL = process.env.FREEPBX_URL || "http://localhost:8080";
const FREEPBX_API_KEY = process.env.FREEPBX_API_KEY || "";

interface CallResult {
  success: boolean;
  callSid?: string;
  error?: string;
}

export async function initiateCall(
  from: string,
  to: string,
  context = "from-internal"
): Promise<CallResult> {
  try {
    const res = await fetch(`${FREEPBX_URL}/admin/api/api.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FREEPBX_API_KEY}`,
      },
      body: JSON.stringify({
        request: "originate",
        channel: `PJSIP/${from}`,
        exten: to,
        context,
        priority: 1,
        callerid: to,
        timeout: 30000,
        async: true,
      }),
    });

    if (!res.ok) {
      return { success: false, error: `FreePBX returned ${res.status}` };
    }

    const data = await res.json();
    return { success: true, callSid: data.ActionID || data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[FreePBX] Call failed:", message);
    return { success: false, error: message };
  }
}

export async function callOperatorGroup(): Promise<CallResult> {
  const ringGroup = process.env.FREEPBX_RING_GROUP || "800";
  return initiateCall("operator", ringGroup);
}

export async function getCallStatus(callSid: string) {
  try {
    const res = await fetch(
      `${FREEPBX_URL}/admin/api/api.php?request=status&actionid=${callSid}`,
      {
        headers: { Authorization: `Bearer ${FREEPBX_API_KEY}` },
      }
    );
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
