# Diary Entry Template

> Transform LinkedIn observations into website diary entries

---

## Entry Structure

```json
{
  "id": "<timestamp>",
  "text": "<distilled observation - 2-4 sentences>",
  "date": "YYYY-MM-DD",
  "image": "<image URL or null>",
  "linkedinUrl": "<original post URL>"
}
```

---

## Transformation Guidelines

### 1. Extract the Core Insight
- **Don't copy the full post** — distill to the essence
- Find the "aha moment" or central paradox
- 2-4 sentences max (50-100 words)

### 2. Keep Sukant's Voice
- Observational, not preachy
- Pattern recognition
- Grounded, human, real
- "Preserving meaning, not producing content"

### 3. Structure the Entry

**Format:**
```
[Title/Hook]: [Core observation]. [Key insight]. [Implication or reflection].
```

**Example:**
```
The Sunfish Paradox: A fish with a walnut-sized brain has survived 
50 million years. Not by being smarter or faster—but by mastering 
simplicity. Survival often comes down to simpler things—clarity 
about what you're good at, consistency in execution, and the wisdom 
to not overcomplicate.
```

---

## Quick Add Command

```bash
# Add diary entry via API
curl -X POST "https://sukantratnakar-api.sukantratnakar.workers.dev/api/admin/save" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Auth: c2a450fbb1559ae393e79372173cb1e3cf1149d99bcd2072fc120594f49db935" \
  -d '{
    "type": "diary",
    "data": [
      <existing entries>,
      {
        "id": "<timestamp>",
        "text": "<observation>",
        "date": "YYYY-MM-DD",
        "image": null,
        "linkedinUrl": "<url>"
      }
    ]
  }'
```

---

## Rakul Workflow

When Sukant shares a LinkedIn post:

1. **Fetch the post** — extract content
2. **Identify the hook** — title, paradox, or key phrase
3. **Distill to 2-4 sentences** — core insight only
4. **Match his voice** — observational, grounded
5. **Add via API** — append to existing entries
6. **Confirm** — share the live link

---

## Example Transformations

### LinkedIn Post → Diary Entry

**Original (long):**
> "The Sunfish Paradox: What This 'Stupid' Fish Teaches Us About Thriving in Business... [500 words about 6 lessons]"

**Diary Entry (short):**
> "The Sunfish Paradox: A fish with a walnut-sized brain has survived 50 million years. Not by being smarter or faster—but by mastering simplicity. Survival often comes down to simpler things—clarity about what you're good at, consistency in execution, and the wisdom to not overcomplicate."

---

## Style Guide

| Do | Don't |
|----|-------|
| Distill to essence | Copy full post |
| Find the paradox/insight | List all points |
| Use observation tone | Be preachy or instructional |
| Keep it tight (50-100 words) | Ramble |
| Link to original | Lose the source |

---

## Fields Reference

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique timestamp (e.g., Date.now()) |
| `text` | Yes | The distilled observation |
| `date` | Yes | ISO date (YYYY-MM-DD) |
| `image` | **Yes** | Image URL (extract from LinkedIn OG tag) |
| `linkedinUrl` | Yes | Link to original post |

### How to Get LinkedIn Image

```bash
curl -s "<linkedin-post-url>" | grep -i "og:image" | head -1
```

Extract the `content="..."` URL.

---

*Last updated: 2026-03-07*
