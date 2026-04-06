# FreePBX Setup — Notra 24

## 1. Netgsm SIP-Trunk einrichten

1. Login unter `http://<server>:8080/admin`
2. **Connectivity → Trunks → Add SIP Trunk**
3. Trunk Name: `netgsm`
4. PEER Details:
   ```
   host=sip.netgsm.com.tr
   type=peer
   username=DEIN_NETGSM_USER
   secret=DEIN_NETGSM_PASS
   fromuser=DEIN_NETGSM_USER
   fromdomain=sip.netgsm.com.tr
   insecure=invite,port
   qualify=yes
   dtmfmode=rfc2833
   context=from-trunk
   disallow=all
   allow=alaw,ulaw
   ```
5. Outbound Route erstellen: `_9X.` → netgsm Trunk

## 2. Operator-Extensions

| Extension | Name           | Gerät    |
|-----------|---------------|----------|
| 101       | Ismail Baysal | Softphone|
| 102       | Operator 2    | Softphone|
| 103       | Operator 3    | Softphone|

**Applications → Extensions → Add SIP Extension**

## 3. Ring Group

- **Applications → Ring Groups → Add Ring Group**
- Group Number: `800`
- Group Description: `Alle Operators`
- Extension List: `101, 102, 103`
- Ring Strategy: `ringall`
- Ring Time: `30`
- Failover: Voicemail

## 4. FreePBX REST API aktivieren

1. **Admin → Module Admin → Install: RESTful API Module**
2. **Admin → REST API → Generate API Key**
3. API Key in `.env` als `FREEPBX_API_KEY` eintragen

## 5. Click-to-Call API Test

```bash
curl -X POST http://localhost:8080/admin/api/api.php \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"request":"originate","channel":"PJSIP/101","exten":"+905321234567","context":"from-internal","priority":1}'
```

## 6. Anrufaufzeichnung aktivieren

1. **Settings → Advanced Settings**
2. `Call Recording` → **Force**
3. Aufzeichnungen unter `/var/spool/asterisk/monitor/`
