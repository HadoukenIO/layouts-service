
# OpenFin Layouts Client API

## Index

### Interfaces

* [Identity](_main_.md#Identity)

### Variables

* [deregister](_main_.md#deregister)
* [undock](_main_.md#undock)

---

## Exports

<a id="deregister"></a>

### `<function>` deregister

**● deregister**: *`function`*

Deregister the specified window to opt it out from snapping behavior. If no Identity is provided will deregister the current window

#### Type declaration
▸(identity?: *[Identity](_main_.md#Identity)*): `Promise`<`void`>

**Parameters:**

| Param | Type |
| ------ | ------ |
| `Optional` identity | [Identity](_main_.md#Identity) | 

**Returns:** `Promise`<`void`>

___
<a id="undock"></a>

### `<function>` undock

**● undock**: *`function`* 

Undock the specified window. If no Identity is provided will undock the current window

#### Type declaration
▸(identity?: *[Identity](_main_.md#Identity)*): `Promise`<`void`>

**Parameters:**

| Param | Type |
| ------ | ------ |
| `Optional` identity | [Identity](_main_.md#Identity) | 

**Returns:** `Promise`<`void`>

___

## Interfaces

<a id="Identity"></a>

### Interface: Identity


#### Properties

<a id="name"></a>

#####  name

**● name**: *`string`*

___
<a id="uuid"></a>

#####  uuid

**● uuid**: *`string`*
___


