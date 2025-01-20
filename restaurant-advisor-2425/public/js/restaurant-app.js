import { content } from './modules/test';
import typeAhead from './modules/typeAhead'; 

console.log('It works!');
console.log(content);
typeAhead(document.querySelector('.form-inline'));
