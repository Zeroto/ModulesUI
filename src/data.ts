// -- For the prototype stage --
import { PrototypeData, ActiveMods, FeatureFlags } from "factorio:common"
declare const data: PrototypeData
declare const mods: ActiveMods
declare const feature_flags: FeatureFlags
// The `settings` global variable is already declared in the runtime stage.
// However, in the prototype stage _only_ `settings.startup` are available.

data.extend([{
  type:"shortcut",
  name: "ModulesUI-shortcut",
  action: "lua",
  icon: "__base__/graphics/technology/module.png",
  icon_size: 256,
  small_icon: "__base__/graphics/technology/module.png",
  small_icon_size: 256,
  technology_to_unlock: "modules",
  unavailable_until_unlocked: true
}])

const styles = data.raw["gui-style"].default

styles['ModulesUISlot'] = {
  type: "empty_widget_style",
  size: 40
}

styles['ModulesUISlot_QualityFlow'] = {
  type: "horizontal_flow_style",
  width: 36,
  left_padding: 4,
  height: 38,
  bottom_padding: 2,
  horizontal_align: "left",
  vertical_align: "bottom"
}
styles['ModulesUISlot_QualityFlow_Indicator'] = {
  type: "image_style",
  size: 13,
  stretch_image_to_widget_size: true
}

styles['ModulesUIFrame'] = {
  type: "frame_style",
  margin: 0,
  padding: 0
}

styles['ModulesUIHeader'] = {
  type: "empty_widget_style",
  parent: "draggable_space",
  horizontally_stretchable: "on",
  vertically_stretchable: "on",
}