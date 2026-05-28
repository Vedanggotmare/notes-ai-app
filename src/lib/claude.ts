import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('VITE_ANTHROPIC_API_KEY is not set. Add it to your .env file.')
    }
    client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  }
  return client
}

export interface CategorizationResult {
  categories: string[]
  tags: string[]
  suggestedTitle: string
  connections: string[]
}

export async function categorizeNote(
  content: string,
  existingNoteIds: string[],
  existingNoteTitles: string[],
  availableCategories: string[]
): Promise<CategorizationResult> {
  const claude = getClient()

  const message = await claude.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Analyze this note and return a JSON object with categorization data.

Available categories: ${availableCategories.join(', ')}
Existing note titles (for finding connections): ${existingNoteTitles.slice(0, 20).join(', ')}

Note content:
"""
${content}
"""

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "categories": ["category1", "category2"],
  "tags": ["tag1", "tag2", "tag3"],
  "suggestedTitle": "A concise title for this note",
  "connections": []
}

Rules:
- categories: 1-3 from the available categories list that best match the content
- tags: 2-5 specific keywords extracted from the content
- suggestedTitle: a clear, concise title (max 60 chars) derived from the content
- connections: titles of existing notes that are topically related (empty array if none)`,
      },
    ],
  })

  const textContent = message.content.find(b => b.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  try {
    const raw = JSON.parse(textContent.text) as {
      categories: string[]
      tags: string[]
      suggestedTitle: string
      connections: string[]
    }

    // Map connection titles back to IDs
    const connectionIds = raw.connections
      .map(title => {
        const idx = existingNoteTitles.indexOf(title)
        return idx >= 0 ? existingNoteIds[idx] : null
      })
      .filter((id): id is string => id !== null)

    return {
      categories: raw.categories.filter(c => availableCategories.includes(c)),
      tags: raw.tags,
      suggestedTitle: raw.suggestedTitle,
      connections: connectionIds,
    }
  } catch {
    return {
      categories: [],
      tags: [],
      suggestedTitle: content.split('\n')[0].slice(0, 60) || 'Untitled',
      connections: [],
    }
  }
}
