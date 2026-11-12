/// <reference types="jest" />
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/**
 * INVARIANTE DE SEGURIDAD (ver auth-user-cache.ts): toda función del
 * backend que modifique o borre una fila de User tiene que invalidar la
 * caché de JwtStrategy EN LA MISMA FUNCIÓN. Borrar un usuario es el único
 * mecanismo de revocación del sistema; si una ruta nueva lo hace sin
 * invalidar, el usuario borrado sigue entrando hasta 30 s.
 *
 * Este test recorre el AST de todo src/ y falla si encuentra una llamada
 * `<algo>.user.update|updateMany|delete|deleteMany|upsert(...)` cuya
 * función contenedora no llame a `.invalidate(` / `.invalidateAll(`.
 * `create` no cuenta: un usuario recién creado no puede estar en caché.
 *
 * Si este test falla en tu cambio, la corrección NO es tocar el test:
 * agrega `this.authUserCache.invalidate(<id>)` después de la escritura.
 */
const SRC = path.resolve(__dirname, '..');
const WRITE_METHODS = new Set([
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
]);

function listTsFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTsFiles(full);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')
      ? [full]
      : [];
  });
}

function enclosingFunction(node: ts.Node): ts.Node | undefined {
  let current = node.parent;
  while (current) {
    if (
      ts.isMethodDeclaration(current) ||
      ts.isFunctionDeclaration(current) ||
      ts.isConstructorDeclaration(current) ||
      ts.isGetAccessor(current) ||
      ts.isSetAccessor(current)
    ) {
      return current;
    }
    // Una arrow/función anónima (ej. el callback de $transaction) no es el
    // límite: el invalidate tiene que ir DESPUÉS del commit, o sea en la
    // función que llama a $transaction. Se sigue subiendo.
    current = current.parent;
  }
  return undefined;
}

interface Violation {
  file: string;
  line: number;
  call: string;
}

function findViolations(): Violation[] {
  const violations: Violation[] = [];

  for (const file of listTsFiles(SRC)) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );

    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        WRITE_METHODS.has(node.expression.name.text) &&
        ts.isPropertyAccessExpression(node.expression.expression) &&
        node.expression.expression.name.text === 'user'
      ) {
        const fn = enclosingFunction(node);
        const body = fn ? fn.getText(source) : '';
        if (!/\.invalidate(All)?\(/.test(body)) {
          violations.push({
            file: path.relative(SRC, file),
            line:
              source.getLineAndCharacterOfPosition(node.getStart(source)).line +
              1,
            call: node.expression.getText(source),
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  return violations;
}

describe('Invariante: toda escritura sobre User invalida la caché del guardia', () => {
  it('ninguna función escribe en User sin llamar a authUserCache.invalidate', () => {
    expect(findViolations()).toEqual([]);
  });

  it('el detector encuentra escrituras (no pasa en vacío)', () => {
    // Si alguien renombra prisma.user o cambia el patrón, el test de arriba
    // pasaría sin revisar nada. Este cuenta que de verdad hay escrituras.
    const files = listTsFiles(SRC).map((f) => fs.readFileSync(f, 'utf8'));
    const writes = files.join('\n').match(/\.user\.(update|delete)\(/g) ?? [];
    expect(writes.length).toBeGreaterThanOrEqual(5);
  });
});
