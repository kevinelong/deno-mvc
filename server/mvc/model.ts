import { DB } from "https://deno.land/x/sqlite/mod.ts";

export interface Field {
  field_name: string;
  field_type: string;
}

export class Model{

  database: string;
  table_name: string;
  field_list: Field[];

  constructor(database:any, table_name:string, field_list:Field[]){

    this.database = database;
    this.table_name = table_name;
    this.field_list = field_list;

    const sql = `CREATE TABLE IF NOT EXISTS ${this.table_name} ( ${this.describe_fields()} );`;
    const db  = new DB(this.database);
    db.query(sql);
    db.close()
  }

  describe_fields(){
    console.log(this.field_list)
    return this.field_list.map(field => `${field.field_name} ${field.field_type}`).join(", ");
  }

  create(data:object){
    const fields = Object.keys(data).join(",");
    const values = Object.values(data).map(v=>`'${v}'`).join(",");
    const sql = `INSERT INTO ${this.table_name} (${fields}) VALUES (${values})`;
    const db  = new DB(this.database);
    db.query(sql);
    db.close();
  }

  read(where:string=""){
    const sql = `SELECT * FROM ${this.table_name} ${where};`;
    const db  = new DB(this.database);
    const results = [...db.query(sql).asObjects()];
    db.close();
    return results;
  }
}

