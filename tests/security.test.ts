import {it,expect} from 'vitest';
import {verifyCsrf} from '../src/lib/security/csrf';
import {publicError,AppError} from '../src/lib/errors';
it('rejects forged origins, missing tokens and mismatched tokens',()=>{const t='a'.repeat(64);expect(()=>verifyCsrf('https://evil.test','https://spectra.test',t,t)).toThrow();expect(()=>verifyCsrf(null,'https://spectra.test',t,t)).toThrow();expect(()=>verifyCsrf('https://spectra.test','https://spectra.test',null,t)).toThrow();expect(()=>verifyCsrf('https://spectra.test','https://spectra.test',t,'b'.repeat(64))).toThrow();expect(()=>verifyCsrf('https://spectra.test','https://spectra.test',t,t)).not.toThrow();});
it('does not expose internal stack traces or secrets',()=>{expect(publicError(new Error('secret password:abc')).error).not.toContain('abc');expect(publicError(new AppError('AUTH',401)).status).toBe(401);});
