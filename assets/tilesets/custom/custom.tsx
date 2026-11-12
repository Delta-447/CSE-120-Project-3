<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.10.2" name="custom" tilewidth="16" tileheight="16" tilecount="4" columns="4">
 <image source="custom_tiles.png" width="64" height="16"/>
 <tile id="0" type="crystal"/>
 <tile id="1" type="spikes">
  <properties>
   <property name="hazard" type="bool" value="true"/>
  </properties>
 </tile>
 <tile id="2" type="spikes">
  <properties>
   <property name="hazard" type="bool" value="true"/>
  </properties>
 </tile>
 <tile id="3" type="checkpoint"/>
</tileset>
