import {TabService} from './TabService';

(window as Window & {TabService: TabService}).TabService = new TabService();
