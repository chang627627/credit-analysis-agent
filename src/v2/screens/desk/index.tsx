// Desk screen barrel (spec §7.1, §9.1): loads the screen's own stylesheet and
// re-exports the component the shell mounts on `#/`.
import './desk.css';

export { DeskScreen } from './Desk';
