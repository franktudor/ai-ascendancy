import typescript from "typescript";
import { parse } from "@vue/compiler-sfc";

export function findUnsafeTypeDeclarations(
  sourceText: string,
  sourceFilename: string,
): string[] {
  const unsafeTypeDiagnostics: string[] = [];
  const scriptBlocks = sourceFilename.endsWith(".vue")
    ? (() => {
        const { descriptor: componentDescriptor } = parse(sourceText);
        return [
          componentDescriptor.script,
          componentDescriptor.scriptSetup,
        ].flatMap((scriptBlock) => (scriptBlock ? [scriptBlock.content] : []));
      })()
    : [sourceText];
  for (const scriptSourceText of scriptBlocks) {
    const sourceFile = typescript.createSourceFile(
      sourceFilename + ".ts",
      scriptSourceText,
      typescript.ScriptTarget.Latest,
      true,
      typescript.ScriptKind.TS,
    );
    const visitTypeNode = (syntaxNode: typescript.Node): void => {
      if (syntaxNode.kind === typescript.SyntaxKind.AnyKeyword) {
        const { line: lineIndex, character: characterIndex } =
          sourceFile.getLineAndCharacterOfPosition(
            syntaxNode.getStart(sourceFile),
          );
        unsafeTypeDiagnostics.push(
          `${sourceFilename}:${lineIndex + 1}:${characterIndex + 1}: explicit untyped keyword`,
        );
      }
      typescript.forEachChild(syntaxNode, visitTypeNode);
    };
    visitTypeNode(sourceFile);
    if (/@ts-(?:ignore|nocheck|expect-error)/.test(scriptSourceText))
      unsafeTypeDiagnostics.push(`${sourceFilename}: compiler suppression`);
  }
  return unsafeTypeDiagnostics;
}
