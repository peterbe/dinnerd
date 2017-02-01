import lf from 'lovefield'

const getSchema = () => {
  let schema = lf.schema.create('dinnerd', 1)

  schema.createTable('Days')
  .addColumn('date', lf.Type.STRING)
  .addColumn('datetime', lf.Type.DATE_TIME)
  .addColumn('text', lf.Type.STRING)
  .addColumn('notes', lf.Type.STRING)
  .addColumn('starred', lf.Type.BOOLEAN)
  .addColumn('modified', lf.Type.DATE_TIME)
  .addColumn('userCreated', lf.Type.STRING)
  .addColumn('userModified', lf.Type.STRING)
  .addPrimaryKey(['date'])

  return schema
}

export default getSchema
