# Whispr SRS v4

## Project: Whispr
**Version:** 1.1
**Status:** Final Draft

---

# 1. INTRODUCTION

## 1.1 Purpose
This SRS defines functional, non-functional, technical, security, and operational requirements for Whispr, an anonymous web-based real-time chat platform enabling 1-to-1 text and video communications. It also includes test cases, architecture, development tasks, and threat models for implementation-ready guidance.

## 1.2 Scope
**Includes:**
- Anonymous, ephemeral sessions
- Randomized matchmaking
- Real-time text + video chat
- Safety & abuse mitigation without login
- Web-only access (desktop & mobile browsers)

**Excludes:**
- Persistent user profiles
- Long-term chat history
- Social networking features

## 1.3 Definitions & Acronyms
| Term | Definition |
|------|-----------|
| Session | Temporary anonymous user presence |
| Room | 1-to-1 pairing of sessions |
| TURN | Relay server for WebRTC fallback |
| ICE | WebRTC connectivity mechanism |
| TTL | Time-to-live for ephemeral data |
| Shadow Ban | Silent restriction without user notification |

## 1.4 References
- WebRTC W3C Specification
- GDPR Principles
- OWASP Top 10

---

# 2. OVERALL SYSTEM DESCRIPTION

## 2.1 Product Perspective
- Browser-based, stateless frontend
- Realtime signaling via Supabase
- Peer-to-peer media via WebRTC
- Minimal backend for moderation, ephemeral storage, and matchmaking

## 2.2 User Classes
| Class | Description |
|-------|------------|
| Anonymous User | Default user with ephemeral session |
| Abusive User | Flagged via reports |
| Restricted User | Temporarily blocked / shadow banned |

## 2.3 Operating Environment
- Modern browsers: Chrome, Edge, Firefox, Safari
- Desktop & mobile devices
- HTTPS required
- WebRTC-compatible devices

## 2.4 Constraints
- No authentication
- No persistent identities
- No server-side video storage
- Compliance with platform hosting policies
- TURN bandwidth / cost limits

---

# 3. SYSTEM FEATURES & FUNCTIONAL REQUIREMENTS

### 3.1 Anonymous Session Management
- FR-1.1: Generate UUID session on page load
- FR-1.2: Destroy session on tab close, Stop button, or inactivity
- FR-1.3: No user identity persisted

### 3.2 Consent & Age Gate
- FR-2.1: Consent modal before matchmaking
- FR-2.2: Age ≥16 & rules acknowledgment required
- FR-2.3: Re-confirm on first video connect

### 3.3 Matchmaking
- FR-3.1: Maintain waiting pool
- FR-3.2: Atomic pairing, no self-match, no consecutive peer repeat
- FR-3.3: Timeout handling & display waiting state

### 3.4 Text Chat
- FR-4.1: Real-time message delivery
- FR-4.2: Ephemeral storage with TTL ≤24h
- FR-4.3: No history retrieval

### 3.5 Video Chat (WebRTC)
- FR-5.1: Request camera/mic permissions
- FR-5.2: Establish P2P connection via signaling
- FR-5.3: TURN fallback mandatory
- FR-5.4: Camera/mic toggle
- FR-5.5: Denied permissions → text-only mode

### 3.6 Session Controls
- FR-6.1: Next → disconnect + rematch
- FR-6.2: Stop → session destroy & return to home
- FR-6.3: Emergency disconnect → instant termination

### 3.7 Safety & Moderation
- FR-7.1: Reporting with categories
- FR-7.2: Auto-disconnect on report
- FR-7.3: Escalation thresholds enforced (cooldown, shadow ban)
- FR-7.4: Rate limiting by device/IP
- FR-7.5: Abuse counters tracked

---

# 4. DATA REQUIREMENTS

| Data | Retention |
|------|-----------|
| Messages | ≤ 24h |
| Session metadata | ≤ 7d |
| Abuse flags | Short-term |
| Video streams | Not stored |

---

# 5. NON-FUNCTIONAL REQUIREMENTS
- Performance: Match latency ≤3s, video startup ≤5s
- Reliability: Heartbeat, cleanup orphaned sessions
- Security: HTTPS, encrypted WebRTC, rate limiting, OWASP compliance
- Privacy: No identity persistence, minimal logging
- Usability: Mobile-first, responsive, clear feedback
- Scalability: Stateless frontend, horizontal scaling, TURN usage control

---

# 6. SYSTEM INTERFACES

### 6.1 User Interface
- Landing page with consent modal
- Waiting/matching page
- Chat room (text/video)
- Session controls & reporting

### 6.2 External Interfaces
- Supabase Realtime API
- TURN / STUN servers
- Hosting platform APIs

---

# 7. FAILURE STATES & RECOVERY

| Failure | Response |
|---------|---------|
| Camera denied | Text-only fallback |
| Peer disconnect | Cleanup + option to rematch |
| Signaling failure | Retry / error page |
| Abuse detected | Auto-disconnect |

---

# 8. ASSUMPTIONS & DEPENDENCIES
- WebRTC-capable browsers
- TURN provider availability
- Hosting uptime

---

# 9. RISKS & THREAT MODEL

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| Abuse / harassment | High | High | Reports, auto-disconnect, shadow bans |
| Bot / spam | Medium | Medium | Rate limiting, CAPTCHA optional |
| TURN overuse | Medium | High | Resolution caps, session limits |
| P2P eavesdropping | Low | High | Encrypted streams |
| Minor access | Medium | Legal | Age gate & repeated consent modal |
| Data leakage | Medium | Medium | Ephemeral storage, TTL, no PII |

---

# 10. ACCEPTANCE CRITERIA
- All functional requirements tested
- Abuse handling works without login
- WebRTC connections succeed under NAT
- Legal pages live & accessible
- TTL-based deletion verified

---

# 11. TEST CASES
### Session
- TC-1: Page load → UUID generated
- TC-2: Tab close → session destroyed
- TC-3: Stop button → session destroyed

### Consent
- TC-4: Consent modal blocks entry if unchecked
- TC-5: Reconfirmation appears on first video
- TC-6: Age <16 → blocked

### Matchmaking
- TC-7: Random pairing succeeds
- TC-8: No self-match
- TC-9: Consecutive peer repeat blocked
- TC-10: Timeout → waiting state

### Chat & Video
- TC-11: Text delivery real-time
- TC-12: Message TTL enforced
- TC-13: Video connection established
- TC-14: TURN fallback functional
- TC-15: Camera/mic denied → fallback to text

### Session Controls
- TC-16: Next → disconnect + rematch
- TC-17: Stop → session end
- TC-18: Emergency disconnect immediate

### Moderation
- TC-19: Report → disconnect
- TC-20: Escalation thresholds enforced
- TC-21: Rate limiting enforced

### Failure States
- TC-22: Signaling fails → retry / error
- TC-23: Peer disconnect → cleanup + rematch

---

# 12. SYSTEM ARCHITECTURE
```
[User Browser]
   |
   |-- HTTPS / WebRTC signaling --> [Supabase Realtime / Backend]
   |
   |-- P2P WebRTC Media --> [Peer Browser]
          |
          +-- TURN Server fallback
```
- Frontend: React + Tailwind
- Backend: Supabase (Postgres + Realtime)
- TURN: NAT traversal & fallback
- Heartbeat & TTL jobs ensure cleanup

---

# 13. DEVELOPER TASK BREAKDOWN

### Frontend
- FE-1: Landing Page & Consent Modal
- FE-2: Waiting / Matching UI
- FE-3: Chat Room (Text + Video)
- FE-4: Session Controls
- FE-5: Failure & fallback UI

### Backend / Realtime
- BE-1: Supabase Realtime config
- BE-2: Matchmaking logic
- BE-3: Session TTL & cleanup jobs
- BE-4: Reports table & escalation logic
- BE-5: TURN server integration

### Security & Moderation
- SEC-1: Device/IP rate limiting
- SEC-2: Shadow banning logic
- SEC-3: Abuse thresholds & monitoring
- SEC-4: Emergency disconnect triggers

### Legal & Compliance
- LC-1: Privacy Policy
- LC-2: Terms of Service
- LC-3: Content Policy
- LC-4: Age confirmation enforcement

### QA / Testing
- QA-1: Unit tests for session & matchmaking
- QA-2: Integration tests WebRTC & chat
- QA-3: Load testing TURN & signaling
- QA-4: Abuse simulation

---

# ✅ SRS v4 Status
Fully incorporates functional requirements, non-functional requirements, security, privacy, failure handling, test cases, architecture, developer tasks, and threat model.

