import React,{useEffect,useRef,useId} from 'react';
import {X,CheckCircle2,AlertTriangle,Search} from 'lucide-react';
export const palette=[['#eee9ff','#6451bd'],['#e5efff','#336db0'],['#e5f3e9','#39734a'],['#fff0e5','#a55d30'],['#e9edf5','#526078']];
export function roleColor(role){const known={Manager:0,Barista:1,Server:2,Cook:3,Cashier:4};const i=known[role]??[...role].reduce((n,c)=>n+c.charCodeAt(0),0)%5;return {'--tint':palette[i][0],'--ink':palette[i][1]};}
export function Avatar({employee}){return <span className="avatar" style={roleColor(employee.roles[0])}>{employee.name.split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase()}</span>;}
export function Button({children,icon:Icon,variant='',className='',...props}){return <button className={`button ${variant} ${className}`} {...props}>{Icon&&<Icon size={17} strokeWidth={1.8}/>}<span>{children}</span></button>;}
export function IconButton({icon:Icon,label,...props}){return <button className="icon-button" aria-label={label} title={label} {...props}><Icon size={18} strokeWidth={1.8}/></button>;}
export function Header({title,description,children}){return <header className="page-header"><div><h1>{title}</h1><p>{description}</p></div><div className="actions">{children}</div></header>;}
export function Field({label,children,hint,className=''}){const id=useId();return <div className={`field ${className}`}><label htmlFor={id}>{label}</label>{React.Children.map(children,child=>React.isValidElement(child)&&['input','select','textarea'].includes(child.type)?React.cloneElement(child,{id,'aria-describedby':hint?id+'-hint':undefined}):child)}{hint&&<small id={id+'-hint'}>{hint}</small>}</div>;}
export function Notice({children,tone='info'}){const Icon=tone==='success'?CheckCircle2:AlertTriangle;return <div className={`notice ${tone}`} role={tone==='error'?'alert':undefined}><Icon size={18}/><div>{children}</div></div>;}
export function Empty({title,children}){return <div className="empty"><h3>{title}</h3><p>{children}</p></div>;}
export function SearchInput({value,onChange,placeholder}){return <div className="search"><Search size={17}/><input aria-label={placeholder} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/></div>;}
export function Modal({title,description,onClose,children,wide=false}){
  const ref=useRef();
  useEffect(()=>{const previous=document.activeElement;const dialog=ref.current;dialog.showModal();return()=>{dialog.close();previous?.focus?.();};},[]);
  return <dialog ref={ref} className={`modal ${wide?'wide':''}`} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current){const r=ref.current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}} aria-labelledby="modal-title"><div className="modal-header"><div><h2 id="modal-title">{title}</h2>{description&&<p>{description}</p>}</div><IconButton icon={X} label="Close dialog" onClick={onClose}/></div>{children}</dialog>;
}
export function Badge({children,tone=''}){return <span className={`badge ${tone}`}>{children}</span>;}
