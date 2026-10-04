var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var Chance = require("orbus").Chance;

var Wererabbit = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

Wererabbit.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: Wererabbit
});

Wererabbit.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    
    // setTimeout(function() {
    //     othis.monster.isBoss = true;
    //     othis.monster.lootDungeonName = "test";
    //     othis.monster.lootLevel = 20.5;
    //     othis.monster.lootTier = 5;
    //     othis.monster.bossTrackingName = "wererabbit";
    // }, 1000);
    
}


module.exports = Wererabbit;