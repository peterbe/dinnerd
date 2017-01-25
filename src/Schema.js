import lf from 'lovefield'

const getSchema = () => {
  let schema = lf.schema.create('dinnerd', 1)

  // Project table
  schema.createTable('Days')
  .addColumn('date', lf.Type.STRING)
  .addColumn('datetime', lf.Type.DATE_TIME)
  .addColumn('text', lf.Type.STRING)
  .addColumn('notes', lf.Type.STRING)
  .addColumn('starred', lf.Type.BOOL)
  .addPrimaryKey(['date'])

  return schema
}

export default getSchema
