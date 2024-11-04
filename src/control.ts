
import { GuiLocation, LuaGuiElement, LuaLogisticNetwork, PlayerIndex, SpriteButtonGuiElement, SpriteButtonGuiElementMembers, TextFieldGuiElement } from "factorio:runtime";

type Player = {
  HideBelowCount: number
  Position?: GuiLocation
}

type Storage = {
  Players: LuaTable<PlayerIndex, Player>
}

declare global { const storage: Storage }

let items = []
for (const [_, v] of prototypes.item)
{
  if (v.type == "module")
    items.push(v.name)
}

let qualities = []
for (const [_, v] of prototypes.quality)
{
  if (v.name != "quality-unknown")
    qualities.push(v.name)
}

script.on_event(defines.events.on_lua_shortcut, data => {
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
    const hideBelowContainer = mainFrame.add({type:"flow", direction: "horizontal", name:"hideBelowContainer"})
    hideBelowContainer.add({type:"label", caption:"Minimum quantity"});
    const p = hideBelowContainer.add({type:"textfield", numeric: true, text: playerInfo.HideBelowCount.toString(), name:"hideBelowCount", caption:"Hide below"})
    p.style.width = 36
    const table = mainFrame.add({type:"table", name:"buttonsTable", column_count:5, style:"filter_slot_table"})

    for (const item of items)
    {
      for (const quality of qualities)
      {
        makeButton(table, item, quality)
      }
    }
  }
})

function makeButton(parent: LuaGuiElement, item: string, quality?: string) {
  const t = parent.add({type:"empty-widget", style:"ModulesUISlot"})
  t.add({type:"sprite-button", sprite:`item/${item}`, name:`ModulesUI_${item}_${quality ?? "common"}`, tags: {"item": item, "quality": quality}})
  if (quality)
  {
    const f = t.add({type: "flow", ignored_by_interaction: true, style:"ModulesUISlot_QualityFlow"})
    f.add({type:"sprite", sprite:`quality/${quality}`, ignored_by_interaction: true, style:"ModulesUISlot_QualityFlow_Indicator"})
  }
}

function updateCount(logistics: LuaLogisticNetwork, table: LuaGuiElement, hideBelowCount: number, item: string, quality?: string)
{
  const count = logistics.get_item_count({name: item, quality: quality});
  for (const [_, v] of pairs(table.children))
    {
      const element = v as LuaGuiElement
      const tags = element.children[0].tags
      if (tags.item == item && tags.quality == quality)
      {
        if (count > hideBelowCount)
        {
          const spriteButton = element.children[0] as SpriteButtonGuiElement;
          spriteButton.number = count;
          element.visible = true
        }
        else
        {
          element.visible = false
        }
      }
    }
}

script.on_event(defines.events.on_tick, data => {
  for (const [k,player] of game.players) {
    if (player.gui.screen['ModulesUI'])
    {
      const hideBelowCount = parseInt((player.gui.screen['ModulesUI']['hideBelowContainer']['hideBelowCount'] as TextFieldGuiElement).text)
      const table = player.gui.screen['ModulesUI']['buttonsTable'];
      // detect location and find logistics network
      let logistics = player.force.find_logistic_network_by_position(player.position, player.surface)
      if (logistics) {
        for (const item of items)
        {
          updateCount(logistics, table, hideBelowCount, item)
          for (const quality of qualities)
          {
            updateCount(logistics, table, hideBelowCount, item, quality)
           
          }
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
})

script.on_event(defines.events.on_gui_click, data => {
  if (data.element.get_mod() != "ModulesUI")
    return;
  
  const item = data.element.tags.item as string
  const quality = data.element.tags.quality as string

  if (item)
  {
    const player = game.get_player(data.player_index);
    player.cursor_ghost = {name: item, quality: quality}
  }
})

function getPlayerInfo(playerIndex: PlayerIndex)
{
  if (storage.Players === undefined)
  {
    storage.Players = new LuaTable<PlayerIndex, Player>();
  }
  if (!storage.Players.has(playerIndex))
  {
    storage.Players.set(playerIndex, {Position: {x: 200, y: 200}, HideBelowCount: 0})
  }
  return storage.Players.get(playerIndex)
}

script.on_event(defines.events.on_gui_text_changed, ev => {
  if (ev.element.get_mod() != "ModulesUI" || ev.element.name !== "hideBelowCount")
    return;

  let playerInfo = getPlayerInfo(ev.player_index)
  playerInfo.HideBelowCount = parseInt((ev.element as TextFieldGuiElement).text)
  storage.Players.set(ev.player_index, playerInfo)
})

script.on_event(defines.events.on_gui_location_changed, ev => {
  if (ev.element.get_mod() != "ModulesUI")
    return;

  let playerInfo = getPlayerInfo(ev.player_index)
  playerInfo.Position = ev.element.location
  storage.Players.set(ev.player_index, playerInfo)
})