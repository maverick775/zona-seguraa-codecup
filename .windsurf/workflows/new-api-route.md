---
description: Create a new API route following project conventions
---

# New API Route

1. Create the route folder and handler file:
   - Path: `zona-seguraa/src/app/api/<resource>/route.js`
   - For dynamic routes: `zona-seguraa/src/app/api/<resource>/[id]/route.js`

2. Use this template:
```js
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  // Extract params...

  const { data, error } = await supabaseServer
    .from('table_name')
    .select('*')

  if (error) {
    console.error('[resource.GET]', error)
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}
```

3. Always respond with `{ data, error }` structure.

4. Add structured logs: `console.info('[resource.method]', { relevant_fields })`.

5. Update the corresponding contract in `CreatingAgentAssets/contracts/` if this endpoint is new.

6. Test manually or via the demo script before marking as done.
