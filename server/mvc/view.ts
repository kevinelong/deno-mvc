
export class View{

  template: string;

  constructor(template:string){
    this.template = template;
  }

  get(data:object){
    let output = this.template;
    Object.entries(data).map(([k,v])=>output=output.replace(new RegExp(`\\{\\s?${k}\\s?\\}`,"g"),`${v}`));
    return output;
  }

}

