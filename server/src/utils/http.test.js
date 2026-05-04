import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { escapeRegex, getPagination, normalizeTags } from './http.js';

describe('http utilities', () => {
  it('bounds pagination values', () => {
    assert.deepEqual(getPagination({ page: '0', limit: '999' }), {
      page: 1,
      limit: 50,
      skip: 0
    });
  });

  it('normalizes tags into unique lowercase values', () => {
    assert.deepEqual(normalizeTags([' AI ', 'ai', 'Robotics']), ['ai', 'robotics']);
  });

  it('escapes regex metacharacters', () => {
    assert.equal(escapeRegex('a+b?'), 'a\\+b\\?');
  });
});

