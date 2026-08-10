import assert from 'node:assert/strict';
import test from 'node:test';

import { escapeHtml } from '../src/ui/html.js';

test('measurement comments are escaped before HTML rendering', () => {
    assert.equal(escapeHtml('<script>"x" & y</script>'), '&lt;script&gt;&quot;x&quot; &amp; y&lt;/script&gt;');
});
