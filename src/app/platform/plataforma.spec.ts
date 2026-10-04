import { isNative } from './plataforma';

describe('plataforma', () => {
  it('en el navegador no es nativo', () => expect(isNative()).toBe(false));
});
