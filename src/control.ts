
import { ButtonGuiElement, CheckboxGuiElement, GuiLocation, LuaGuiElement, LuaLogisticNetwork, LuaPlayer, PlayerIndex, SpriteButtonGuiElement, SpriteButtonGuiElementMembers, TextFieldGuiElement } from "factorio:runtime";

type Player = {
  HideBelowCount: number
  Position?: GuiLocation
  HiddenTiers?: number[]
}

type Storage = {
  Players: LuaTable<PlayerIndex, Player>
}

type ItemModule = {
  name: string,
  category: string,
  tier: number
}

declare global { const storage: Storage }

let tiers: number[] = []
let items: ItemModule[] = []
for (const [_, v] of prototypes.item)
{
  if (v.type == "module") {
    items.push({name: v.name, category: v.category, tier: v.tier});
    if (tiers.indexOf(v.tier) === -1)
      tiers.push(v.tier);
  }
}

let qualities: string[] = []
for (const [_, v] of prototypes.quality)
{
  if (v.name != "quality-unknown")
    qualities.push(v.name)
}

script.on_configuration_changed(ev => {
  for (let [_, player] of game.players) {
    if (player.gui.screen['ModulesUI'])
      player.gui.screen['ModulesUI'].destroy();
  }
})

script.on_event(defines.events.on_lua_shortcut, data => {
  if (data.prototype_name !== "ModulesUI-shortcut")
    return;

  let player = game.get_player(data.player_index)
  let playerInfo = getPlayerInfo(data.player_index)
  let screenElement = player.gui.screen
  if (screenElement['ModulesUI'])
    screenElement['ModulesUI'].destroy();
  else {
    let mainFrame = screenElement.add({type: "frame", name:"ModulesUI", style: "ModulesUIFrame", direction: "vertical"})
    mainFrame.location = playerInfo.Position
    let header = mainFrame.add({type: "flow"})
    header.add({type: "label", caption: "Modules"})
    let drag = header.add({type: "empty-widget", style: "ModulesUIHeader"})
    drag.drag_target = mainFrame;
    let filterButton = header.add({type:"sprite-button", auto_toggle:true, name:"ShowFilter", style:"frame_action_button", sprite:"utility/expand_dots"})
    filterButton.style.size = 16;
    let closeButton = header.add({type:"sprite-button", name:"CloseWindow", style:"frame_action_button", sprite:"utility/close"})
    closeButton.style.size = 16;

    const optionsContainer = mainFrame.add({type:"flow", direction: "vertical", name:"optionsContainer"})
    optionsContainer.visible = false;
    const hideBelowContainer = optionsContainer.add({type:"flow", direction: "horizontal", name:"hideBelowContainer"})
    hideBelowContainer.add({type:"label", caption:"Minimum quantity"});
    const p = hideBelowContainer.add({type:"textfield", numeric: true, text: playerInfo.HideBelowCount.toString(), name:"hideBelowCount", caption:"Hide below"})
    p.style.width = 36
    const tierSelectionContainer = optionsContainer.add({type: "flow", direction: "horizontal", name: "tierSelectionContainer"})
    if (tiers.length > 0) {
      tierSelectionContainer.add({type:"label", caption:"Show tiers"});
      for (const tier of tiers) {
        tierSelectionContainer.add({type:"checkbox", state: (playerInfo.HiddenTiers ?? []).indexOf(tier) == -1, caption: tier.toString(), tags: {tier: tier}})
      }
    }

    const table = mainFrame.add({type:"table", name:"buttonsTable", column_count:5, style:"filter_slot_table"})

    for (const item of items)
    {
      for (const quality of qualities)
      {
        makeButton(table, item, quality)
      }
    }

    tick();
  }
})

function makeButton(parent: LuaGuiElement, item: ItemModule, quality?: string) {
  const t = parent.add({type:"empty-widget", style:"ModulesUISlot"})
  t.add({type:"sprite-button", sprite:`item/${item.name}`, name:`ModulesUI_${item.name}_${quality ?? "common"}`, tooltip: "0",elem_tooltip: {type: "item-with-quality", name:item.name, quality: quality}, tags: {"item": item.name, "quality": quality, tier: item.tier}})
  if (quality)
  {
    const f = t.add({type: "flow", ignored_by_interaction: true, style:"ModulesUISlot_QualityFlow"})
    const f2 = f.add({type:"sprite", sprite:`quality/${quality}`, ignored_by_interaction: true, style:"ModulesUISlot_QualityFlow_Indicator"})
  }
}

function updateCountButton(logistics: LuaLogisticNetwork, button: LuaGuiElement, hideBelowCount: number, hiddenTiers: number[])
{
  const tags = button.tags
  if (hiddenTiers.indexOf(tags.tier as number) >= 0)
  {
    button.parent.visible = false
    return;
  }

  const count = logistics.get_item_count({name: tags.item as string, quality: tags.quality as string});
  if (count >= hideBelowCount)
  {
    const spriteButton = button as SpriteButtonGuiElement;
    spriteButton.number = count;
    spriteButton.tooltip = `Available: ${count}`;
    button.parent.visible = true
  }
  else
  {
    button.parent.visible = false
  }
}

function tick() {
  for (const [k,player] of game.players) {
    tickPlayer(player)
  }
}

function tickPlayer(player: LuaPlayer) {
  if (player.gui.screen['ModulesUI'])
  {
    let playerInfo = getPlayerInfo(player.index)
    const table = player.gui.screen['ModulesUI']['buttonsTable'];
    // detect location and find logistics network
    let logistics = player.force.find_logistic_network_by_position(player.position, player.surface)
    if (logistics) {
      for (const [_, v] of pairs(table.children))
      {
          const element = v as LuaGuiElement
          updateCountButton(logistics, element.children[0], playerInfo.HideBelowCount, playerInfo.HiddenTiers ?? [])
      }
    }
    else
    {
      for (const [_, v] of pairs(table.children))
      {
        const element = v as LuaGuiElement
        const tags = element.children[0].tags
        if (tags.item)
        {
          const spriteButton = element.children[0] as SpriteButtonGuiElement;
          spriteButton.number = 0;
          element.visible = false
        }
      }
    }
  }
}

script.on_nth_tick(60, data => {
  tick()
})

script.on_event(defines.events.on_player_changed_position, ev => {
  const player = game.get_player(ev.player_index)
  tickPlayer(player)
})

script.on_event(defines.events.on_player_changed_surface, ev => {
  const player = game.get_player(ev.player_index)
  tickPlayer(player)
})

function getPlayerInfo(playerIndex: PlayerIndex)
{
  if (storage.Players === undefined)
  {
    storage.Players = new LuaTable<PlayerIndex, Player>();
  }
  if (!storage.Players.has(playerIndex))
  {
    storage.Players.set(playerIndex, {Position: {x: 200, y: 200}, HideBelowCount: 1})
  }
  return storage.Players.get(playerIndex)
}

script.on_event(defines.events.on_gui_text_changed, ev => {
  if (ev.element.get_mod() != "ModulesUI" || ev.element.name !== "hideBelowCount")
    return;

  let playerInfo = getPlayerInfo(ev.player_index)
  playerInfo.HideBelowCount = parseInt((ev.element as TextFieldGuiElement).text)
  storage.Players.set(ev.player_index, playerInfo)

  const player = game.get_player(ev.player_index)
  tickPlayer(player)
})

script.on_event(defines.events.on_gui_location_changed, ev => {
  if (ev.element.get_mod() != "ModulesUI")
    return;

  let playerInfo = getPlayerInfo(ev.player_index)
  playerInfo.Position = ev.element.location
  storage.Players.set(ev.player_index, playerInfo)
})

script.on_event(defines.events.on_gui_click, ev => {
  if (ev.element.get_mod() != "ModulesUI")
    return;

  const player = game.get_player(ev.player_index)

  if (ev.element.name === "ShowFilter") {
    const elem = ev.element as ButtonGuiElement
    player.gui.screen['ModulesUI']['optionsContainer'].visible = elem.toggled
  }
  else if (ev.element.name === "CloseWindow") {
    player.gui.screen['ModulesUI'].destroy()
  }
  else if (ev.element.parent?.name === "tierSelectionContainer" && ev.element.tags.tier)
  {
    const checkbox = ev.element as CheckboxGuiElement
    const tier = ev.element.tags.tier as number;
    let playerInfo = getPlayerInfo(ev.player_index)
    if (playerInfo.HiddenTiers === undefined)
      playerInfo.HiddenTiers = []

    const index = playerInfo.HiddenTiers.indexOf(tier);
    if (!checkbox.state && index == -1)
      playerInfo.HiddenTiers.push(tier)
    else if (checkbox.state && index >= 0)
      playerInfo.HiddenTiers.splice(index,1)

    storage.Players.set(ev.player_index, playerInfo)
    tickPlayer(player)
  }
  else if (ev.element.parent?.parent?.name === "buttonsTable") {
    const item = ev.element.tags.item as string
    const quality = ev.element.tags.quality as string
  
    if (item)
    {
      player.cursor_ghost = {name: item, quality: quality}
    }
  }
})