import "server-only";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
} from "docx";

export interface PrintableSection {
  heading: string;
  headers: string[];
  rows: Array<Array<string | number | boolean | null | undefined>>;
}

/**
 * Generic Word document builder: title + one table per section.
 */
export async function buildPrintableDoc(
  title: string,
  sections: PrintableSection[]
): Promise<Document> {
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Generated: ${new Date().toLocaleString()}`, italics: true }),
      ],
      spacing: { after: 320 },
    }),
  ];

  sections.forEach((section) => {
    children.push(
      new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 160 },
      })
    );

    const rows = [
      new TableRow({
        tableHeader: true,
        children: section.headers.map(
          (header) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: header, bold: true, color: "FFFFFF" })],
                }),
              ],
              shading: { fill: "03834D" },
            })
        ),
      }),
      ...section.rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (value) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      text:
                        value === null || value === undefined
                          ? ""
                          : typeof value === "boolean"
                            ? value ? "Yes" : "No"
                            : String(value),
                    }),
                  ],
                })
            ),
          })
      ),
    ];

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        },
      })
    );
  });

  return new Document({
    sections: [{ children }],
  });
}

export async function docToBuffer(doc: Document): Promise<Buffer> {
  return Packer.toBuffer(doc);
}
