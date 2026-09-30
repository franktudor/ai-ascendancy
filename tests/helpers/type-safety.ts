import ts from "typescript";
import { parse } from "@vue/compiler-sfc";

export function unsafeTypes(text: string, filename: string): string[] {
  const errors: string[] = [];
  const scripts = filename.endsWith(".vue")
    ? (() => {
        const { descriptor } = parse(text);
        return [descriptor.script, descriptor.scriptSetup].flatMap((block) =>
          block ? [block.content] : [],
        );
      })()
    : [text];
  for (const script of scripts) {
    const source = ts.createSourceFile(
      filename + ".ts",
      script,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const visit = (node: ts.Node): void => {
      if (node.kind === ts.SyntaxKind.AnyKeyword) {
        const { line, character } = source.getLineAndCharacterOfPosition(
          node.getStart(source),
        );
        errors.push(
          `${filename}:${line + 1}:${character + 1}: explicit untyped keyword`,
        );
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    if (/@ts-(?:ignore|nocheck|expect-error)/.test(script))
      errors.push(`${filename}: compiler suppression`);
  }
  return errors;
}
