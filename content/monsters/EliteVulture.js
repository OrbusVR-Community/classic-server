/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var EliteVulture = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

EliteVulture.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: EliteVulture
});

EliteVulture.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 5.5;
    this.monster.setMovementSpeed(6.5);
    this.monster.lootTier = 4;
    if(this.gameObject.zone.zoneInfo.safetyLevel < 0.5 && this.gameObject.zone.zoneInfo.isOverworld) {
        this.monster.allowEpicDrop = true;
    }

    this.timeSinceSpit = 0;
    this.spitEvery = 4;
    this.spitSize = new Vector3(8, 20, 8);
    this.spitPotency = 800;
    this.spitDelay = 2.5;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        othis.timeSinceSpit++;

        if(othis.timeSinceSpit > othis.spitEvery) {
            othis.timeSinceSpit = 0;
            args.takeOpportunity();
            setTimeout(function() {
                args.finishOpportunity();
            }, 1500);
            othis.doSpitFire();
        }
    });
}

EliteVulture.prototype.doSpitFire = function() {
    //Spit randomly around the battlefield.
    var othis = this;
    var basePosition = this.gameObject.getWorldPosition();
    
    for(var i=0; i < 10; i++) {
        //Choose a random position.
        var entPos = new Vector3(basePosition.x + Math.random() * 60 - 30, basePosition.y, basePosition.z + Math.random() * 60 - 30);
        entPos.y = othis.gameObject.zone.getGroundHeightAt(entPos.x, entPos.z);
        console.log("SPIT AT");
        console.log(entPos);
        var newent = othis.gameObject.zone.spawnEntity("VultureSpit", entPos);
        var dangerComponent = newent.gameObject.getComponent("MomentaryDanger");
        dangerComponent.dangerZone(entPos, othis.spitSize, othis.spitDelay + Math.random() * 0.50, function(objectsHit) {
            _.each(objectsHit, function(anobj) {
                othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.spitPotency), sender: othis.gameObject.entity, dmgType: "magical"});
            });
        });
    }
}

module.exports = EliteVulture;
