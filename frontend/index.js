/**
 * @format
 */

import 'react-native-get-random-values';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

const appRegistryNames = new Set([appName, 'AndroidSeed']);

for (const registryName of appRegistryNames) {
  AppRegistry.registerComponent(registryName, () => App);
}
