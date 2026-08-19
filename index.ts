import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import App from './App';
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// El widget de Android se renderiza en un contexto headless de la app:
// el task handler abre la base de datos y dibuja el widget con datos frescos.
registerWidgetTaskHandler(widgetTaskHandler);