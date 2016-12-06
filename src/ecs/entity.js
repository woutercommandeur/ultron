var BitSet = require('./bitset'),
    FastBitSet = require('./fastbitset');

exports = module.exports = Entity;

/**
 * @final
 * @class Entity
 * @constructor
 */
function Entity(world, id) {
  console.log(world);
  /**
   * @private
   * @property {Uint} _id
   */
  this._id = id;

  /**
   * @private
   * @property {World} _world
   */
  this._world = world;

  /**
   * @private
   * @property {Boolean} _alive
   */
  this._alive = true;

  /**
   * @private
   * @property {Boolean} _waitingForRefresh
   */
  this._waitingForRefresh = false;

  /**
   * @private
   * @property {Boolean} _waitingForRemoval
   */
  this._waitingForRemoval = false;

  /**
   * @private
   * @property {BitSet} _componentMask
   */
  this._componentMask = world.MAX_COMPONENTS <= 32
    ? new FastBitSet()
    : new BitSet(world.MAX_COMPONENTS);

  /**
   * @private
   * @property {BitSet} _groupMask
   */
  this._groupMask = world.MAX_GROUPS <= 32
    ? new FastBitSet()
    : new BitSet(world.MAX_GROUPS);

  /**
   * @private
   * @property {BitSet} _systemMask
   */
  this._systemMask = world.MAX_SYSTEMS <= 32
    ? new FastBitSet()
    : new BitSet(world.MAX_SYSTEMS);
}

/**
 * @method get
 * @param  {Uint} type
 * @return {Object}
 */
Entity.prototype.get = function Entity_get(type) {
  return this._world._getComponent(this, type);
};

/**
 * @method add
 * @param {Object} component
 * @param {Uint} type
 */
Entity.prototype.add = function Entity_add(component, type) {
  this._world._addComponent(this, component, type);
};

/**
 * @method remove
 * @param {Uint} type
 */
Entity.prototype.remove = function Entity_remove(type) {
  this._world._removeComponent(this, type);
};

/**
 * @method clear
 */
Entity.prototype.clear = function Entity_clear() {
  this._world._removeComponents(this);
};

/**
 * @method kill
 */
Entity.prototype.kill = function Entity_kill() {
  this._world.kill(this);
};

/**
 * @property {Uint} id
 */
Object.defineProperty(Entity.prototype, 'id', {
  get: function() {
    return this._id;
  }
});

/**
 * @property {Boolean} alive
 */
Object.defineProperty(Entity.prototype, 'alive', {
  get: function() {
    return this._alive;
  }
});
