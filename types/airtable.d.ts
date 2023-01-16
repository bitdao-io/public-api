interface AirtableFields {
  id: string
  [FieldName.Show]?: boolean
  active?: boolean
}

interface AirtableRecord<T extends AirtableFields> {
  id: string
  fields: T
}

enum FieldName {
  PageOrder = 'page_order',
  Show = 'show',
}

export { FieldName }

export type { AirtableRecord, AirtableFields }
