📄 Whispr — Product Requirements Document (**PRD** v3)

Status: Launch-Hardened Product Class: Anonymous Real-Time Communication Platform Tagline: Talk freely. Leave no trace.

1 Product Vision & Positioning (Updated) Vision

Whispr is a safety-first anonymous chat platform designed for spontaneous human connection—without profiles, history, or identity baggage.

### Positioning Statement

Unlike legacy random chat platforms, Whispr prioritizes consent, clarity, and control, delivering anonymous conversations with modern UX and built-in safeguards.

Differentiators

Explicit consent before connection

Ephemeral-by-default sessions

Stronger abuse mitigation without accounts

Modern UI + mobile-first reliability

2 Goals & Non-Goals 

### Product Goals

Instant anonymous matching (≤3s median)

Stable 1:1 video + text

Abuse containment without login

Legal & platform survivability

Non-Goals

Social networking

Persistent identities

Content discovery

Long-term chat history

3 Target Users

Age: 16+ (layered enforcement)

Primary: Students, young adults, casual users

Geography: Global (mobile & low-bandwidth friendly)

### Explicitly Excluded

Minors

Explicit content seekers

Bots / automation

4 Core Product Principles (Enforced)

Ephemeral by default

Consent before camera

Leave anytime, no trace

Safety > virality

Degrade gracefully

5 User Experience Flow (Hardened) 5.1 Entry & Consent Gate (Mandatory)

Before matchmaking, user must:

Confirm age (16+)

Accept rules:

No nudity

No harassment

No illegal activity

Acknowledge camera/mic usage

UX Enforcement

Modal cannot be skipped

Re-shown on first video connection per session

5.2 Permission Handling (Defined)
Scenario	Behavior
Camera allowed	Video + text enabled
Camera denied	Text-only fallback
Mic denied	Video + muted state
Both denied	Text-only mode

User can retry permissions anytime.

5.3 Matchmaking Flow (Atomic)

Session enters waiting pool

Atomic lock attempts pairing

Room created only once

Heartbeat begins

Timeout cleanup if peer drops

6 Core Features (v3) 6.1 Anonymous Sessions

**UUID** session ID

Exists only in memory + short DB **TTL**

Destroyed on exit or timeout

6.2 Chat (Ephemeral)

Real-time text

Messages stored temporarily only

Auto-purged via **TTL** job

Default retention: ≤ 24 hours (configurable)

6.3 Video Chat (WebRTC Hardened)

Peer-to-peer preferred

**TURN** fallback mandatory

Resolution caps (mobile-first)

Adaptive bitrate

6.4 Session Controls

Next → immediate disconnect + rematch

Stop → session destroy

Emergency Disconnect → instant peer drop

7 Safety & Moderation System (v3) 7.1 Reporting

Categories:

Harassment

Sexual content

Hate speech

Spam / bot

Other

Report triggers:

Immediate disconnect

Abuse counter increment

7.2 Abuse Thresholds (Defined)
Condition	Action
1 report	Disconnect
2 reports (24h)	Session cooldown
3+ reports	Shadow ban (device/IP)
Rapid reconnect abuse	Temporary block
7.3 Enforcement (No Login)

Privacy-light device hash

IP rate limiting

Session cooldown timers

Shadow bans (non-persistent identity)

7.4 Safety Modes (New)

Text-only mode toggle

Camera-off default (optional)

Re-confirm consent on reconnect

8 Technical Architecture (v3)
8.1 Stack
Layer	Tech
Frontend	React (Vite / Next.js **CSR**)
Styling	Tailwind **CSS**
Signaling	Supabase Realtime
DB	Supabase Postgres
Video	WebRTC
**TURN**	Managed **TURN** (Metered / Twilio / CF Calls)
Hosting	Vercel
8.2 WebRTC Flow (Final)

Media permission request

RTCPeerConnection created

Offer/Answer via signaling channel

**ICE** candidates throttled

**TURN** used if direct fails

Monitor connection state

Cleanup on exit / failure

9 Data Model (v3) sessions id **UUID** created_at **TIMESTAMP** last_seen **TIMESTAMP** is_active **BOOLEAN**

rooms id **UUID** session_a **UUID** session_b **UUID** created_at **TIMESTAMP**

messages (ephemeral) id **UUID** room_id **UUID** sender **UUID** content **TEXT** created_at **TIMESTAMP** ttl **TIMESTAMP**

reports id **UUID** room_id **UUID** reporter **UUID** reason **TEXT** created_at **TIMESTAMP**

10 Data Retention & Privacy
Data	Retention
Messages	≤ 24h
Session metadata	≤ 7 days
IP / abuse flags	Short-term only
Video	Never stored

No analytics tied to identity.

11 Legal & Compliance (v3)

Required before public launch:

Terms of Service

### Privacy Policy

### Content Policy

Age restriction notice

Abuse contact email

Jurisdiction disclaimer

12 Non-Functional Requirements

Match latency ≤ 3s (median)

Video startup ≤ 5s

Mobile-first responsive

Chrome, Edge, Firefox, Safari

Graceful failure states

13 Metrics & Observability

Tracked (anonymously):

Match success rate

Disconnect reasons

Abuse reports / **100** sessions

**TURN** usage %

Cost per session

14 **MVP** vs Phase Roadmap **MVP** (Public Beta)

Anonymous text + video

Consent gate

Moderation thresholds

**TURN** fallback

Safety modes

Phase 2

Interest tags

Moderator dashboard

Language filters

UI polish

1️⃣5️⃣ Risks & Kill Switch ### Key Risks

Abuse spikes

**TURN** cost explosion

Platform complaints

Kill-Switch Criteria

Abuse rate exceeds threshold

**TURN** cost > budget ceiling

Legal takedown notice