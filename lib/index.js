'use strict';

const _ = require('lodash'),
  Promise = require('bluebird'),
  sprintf = require('sprintf-js').sprintf,
  Db = require('./db'),
  utils = require('./utils'),

  pluralize = utils.pluralize,
  class_name_to_table_name = utils.class_name_to_table_name,
  class_name_to_foreign_key = utils.class_name_to_foreign_key,
  table_name_to_class_name = utils.table_name_to_class_name,
  table_name_to_foreign_key = utils.table_name_to_foreign_key;

function get_class(obj) {
  return obj.__cls;
}

/**
 *  @class Model
 *  @short The abstract base class for DB-backed model objects.
 *  @details Every object of a subclass of Model are mapped 1:1 to records of a table in
 *  a relational DB. Naming conventions assume that if the Model subclass is called
 *  <tt>SeaLion</tt>, DB records are stored in a table called <tt>sea_lions</tt>.
 *  Conversely, if an object of another class is in a relation with your object, it is assumed that a
 *  foreign key called <tt>my_product_id</tt> exists in the other table. Of course this is overridable
 *  by setting explicitly <tt>tableName</tt> and <tt>foreignKeyName</tt> to a value of your choice.
 */

/**
 *  @fn Model(_values)
 *  @short Constructs and initializes a Model object.
 *  @details Due to the lack of a static class initialization method,
 *  the default constructor is in charge of gathering information about
 *  the bound table columns the first time an object is created. Subsequent
 *  creations will use the values stored in static class variables.
 *  Subclassers don't need to override the constructor. They can in turn
 *  override the <tt>init</tt> method in order to perform custom initialization.
 *  @param values Column values to initialize the object.
 */
function Model(values) {
  this.construct(values);
}

_.assign(Model.prototype, {

  construct: function(values) {
    this.values = {};
  
    if (!_.isEmpty(values)) {
      const classname = get_class(this);
      const self = this;
      this.initialize().then(function() {
          let columns = self._getColumns(classname);
  
          _.forEach(values, function(val, key) {
            let keyexists = _.includes(columns, key);
            if (keyexists) {
              self.values[key] = val;
            }
          });
          self.init(values);
        });
    }
  },

  initialize: function() {
    const classname = get_class(this);
    const self = this;

    let initialized = this._isInitialized(classname);

    if (!initialized) {
      const conn = Db.getConnection();

      conn.prepare('DESCRIBE `{1}`', this._getTableName());
      initialized = conn.exec()
        .then(function(results) {
          let columns = [];

          _.forEach(results, function(row) {
            columns.push(row['Field']);
          });
          self._set_columns(classname, columns);
          Db.closeConnection(conn);
        });

      self._setInitialized(classname, initialized);
    }
    return initialized;
  },

  /**
   *  @attr __cls
   *  @short Class name of this model.
   */
  __cls: 'Model',

  /**
   *  @attr columns
   *  @short Array of columns for the model object.
   */
  columns: [],

  /**
   *  @attr _classInitialized
   *  @short Array containing initialization information for subclasses.
   */
  _classInitialized: [],

  /**
   *  @attr belongsToClasses
   *  @short Array containing information on parent tables for subclasses.
   */
  belongsToClasses: [],

  /**
   *  @attr hasManyClasses
   *  @short Array containing information on child tables for subclasses.
   */
  hasManyClasses: [],

  /**
   *  @attr objectPool
   *  @short Pool of objects already fetched from DB.
   */
  objectPool: [],

  /**
   *  @attr tableName
   *  @short Name of the table bound to this model class.
   */
  tableName: null,

  /**
   *  @attr primaryKey
   *  @short Name of the primary key column for the bound table.
   *  @details Set this attribute only when the primary key of the bound table is not the canonical <tt>id</tt>.
   */
  primaryKey: 'id',

  /**
   *  @attr foreignKeyName
   *  @short Used to create the name of foreign key column in tables that are in a relationship with the bound table.
   *  @details Set this attribute only when the foreign key that references objects of this class
   *  is not the canonical name (e.g. 'product' for class Product).
   */
  foreignKeyName: null,

  /**
   *  @attr values
   *  @short Map of values for the columns of model object.
   */
  values: null,

  /**
   *  @fn init(values)
   *  @short Performs specialized initialization tasks.
   *  @details Subclassers will use this method to perform custom initialization.
   *  @note The default implementation simply does nothing.
   *  @param values A map of column-value pairs to initialize the receiver.
   */
  init: function(values) {},

  /**
   *  @fn getTableName
   *  @short Returns the name of the table bound to this class.
   *  @details This method returns the name of the table which contains
   *  data for objects of this class. If the Model subclass is called <tt>SeaLion</tt>,
   *  the table name will be <tt>sea_lions</tt>. Of course you can override this behavior by
   *  setting explicitly the value of <tt>tableName</tt> in the declaration of your class.
   */
  _getTableName: function() {
    if (!this.tableName) {
      let classname = get_class(this);
      this.tableName = class_name_to_table_name(classname);
    }
    return this.tableName;
  },

  /**
   *  @fn getForeignKeyName
   *  @short Returns the name of the foreign key for this class.
   *  @details This method returns the name of the column to lookup when considering relations
   *  with objects of this class. If the Model subclass is called <tt>MyRecord</tt>,
   *  the foreign key name will be <tt>my_record_id</tt>. Of course you can override this behavior by
   *  setting explicitly the value of <tt>foreignKeyName</tt> in the declaration of your class.
   */
  _getForeignKeyName: function() {
    if (_.isEmpty(this.foreignKeyName)) {
      classname = get_class(this);
      this.foreignKeyName = class_name_to_foreign_key(classname);
    }
    return this.foreignKeyName;
  },

  /**
   *  @fn getPrimaryKey
   *  @short Returns the name of the primary key for this class.
   *  @details This method returns the name of the primary key in the table bound to this class.
   *  By default, Model considers as primary key a column named <tt>id</tt>. Of course you can override
   *  this behavior by setting explicitly the value of <tt>primaryKey</tt> in the declaration of your class.
   */
  _getPrimaryKey: function() {
    if (!this.primaryKey) {
      this.primaryKey = 'id';
    }
    return this.primaryKey;
  },

  /**
   *  @fn _hasColumn(key)
   *  @short Verifies the existence of a column named <tt>key</tt> in the bound table.
   *  @param key The name of the column to check.
   */
  _hasColumn: function(key) {
    let classname = get_class(this);
    let columns = this._getColumns(classname);

    return !_.isUndefined(columns[key]);
  },

  /**
   *  @fn belongsTo(tableName)
   *  @short Loads the parent of the receiver in a one-to-many relationship.
   *  @param tableName The name of the parent table.
   */
  belongsTo: function(tableName) {
    let classname = get_class(this);
    let columns = this._getColumns(classname);
    let ownerclass = table_name_to_class_name(tableName);
    let owner = new global[ownerclass]();
    if (!_.isUndefined(columns[table_name_to_foreign_key(tableName)])) {
      owner.findById(this.values[table_name_to_foreign_key(tableName)]);
    } else if (!_.isUndefined(columns[owner.foreignKeyName])) {
      owner.findById(this.values[owner.foreignKeyName]);
    }
    this.values[singularize(tableName)] = owner;
    owner.values[singularize(this.tableName)] = this;
  },

  /**
   *  @fn hasMany(tableName, params)
   *  @short Loads the children of the receiver in a one-to-many relationship.
   *  @param tableName The name of the child table.
   *  @param params An array of conditions. For the semantics, see findAll
   *  @see findAll
   */
  hasMany: function(tableName, params) {
    params = params || [];

    let childclass = table_name_to_class_name(tableName);
    let obj = new global[childclass]();
    let fkey = this.getForeignKeyName();
    if (!_.isUndefined(params['whereClause'])) {
      params['whereClause'] = sprintf("(%s) AND `%s` = '%s' ", params['whereClause'], fkey, this.values[this.primaryKey]);
    } else {
      params['whereClause'] = sprintf("`%s` = '%s' ", fkey, this.values[this.primaryKey]);
    }
    children = obj.findAll(params);
    if (children.length > 0) {
      let self = this;
      _.forEach(children, function(child) {
        child.values[singularize(self.tableName)] = self;
      });
      this.values[tableName] = children;
    }
  },

  /**
   *  @fn hasAndBelongsToMany(tableName, params)
   *  @short Loads the object network the receiver belongs to in a many-to-many relationship.
   *  @param tableName The name of the peer table.
   *  @param params An array of conditions. For the semantics, see findAll
   *  @see findAll
   */
  hasAndBelongsToMany: function(tableName, params) {
    params = params || [];

    const conn = Db.getConnection();

    let peerclass = table_name_to_class_name(tableName);
    let peer = new global[peerclass]();
    fkey = this.getForeignKeyName();
    peer_fkey = peer.getForeignKeyName();

    // By convention, relation table name is the union of
    // the two member tables' names joined by an underscore
    // in alphabetical order
    tableNames = [tableName, this.tableName];
    tableNames.sort();
    relation_table = tableNames.join('_');

    conn.prepare("SELECT * FROM `{1}` WHERE `{2}` = '{3}'",
      relation_table,
      fkey,
      this.values[this.primaryKey]);

    let self = this;
    conn.exec()
      .then(function(results) {
        // if (conn.num_rows() > 0) {
        //   self.values[tableName] = [];
        //   while (row = conn.fetch_assoc()) {
        //     peer = new global[peerclass]();
        //     peer.findById(row[peer_fkey]);
        //     self.values[tableName].push(peer);
        //     peer.values[self.tableName] = [self];
        //     //print_r(peer);
        //   }
        // }
        // conn.free_result();
      });

    // if (conn.num_rows() > 0) {
    //   this.values[tableName] = [];
    //   while (row = conn.fetch_assoc()) {
    //     peer = new global[peerclass]();
    //     peer.findById(row[peer_fkey]);
    //     this.values[tableName].push(peer);
    //     peer.values[this.tableName] = array(this);
    //     //print_r(peer);
    //   }
    // }
    // conn.free_result();

    Db.closeConnection(conn);
  },

  /**
   *  @fn hasOne(tableName)
   *  @short Loads the child the receiver in a one-to-one relationship.
   *  @param tableName The name of the child table.
   *  @param params An array of conditions. For the semantics, see findAll
   *  @see findAll
   */
  hasOne: function(tableName) {
    childclass = table_name_to_class_name(tableName);
    obj = new global[childclass]();
    fkey = this.getForeignKeyName();
    children = obj.findAll({
        'whereClause': sprintf("`%s` = '%s'", fkey, this.values[this.primaryKey]),
        'limit': 1
      });
    if (children.length > 0) {
      child = children[0];
      child.values[singularize(this.tableName)] = this;
      this.values[singularize(tableName)] = child;
    }
  },

  /**
   *  Finder methods
   */

  /**
   *  @fn findByQuery(query)
   *  @short Returns an array of model objects by executing a custom SELECT query.
   *  @details This is a powerful instance method to retrieve objects from the DB with a custom query.
   *  You can, among other things, do LEFT JOIN queries here.
   *  @param query The SELECT query to fetch objects.
   */
  findByQuery: function(query) {
    conn = Db.getConnection();

    ret = null;

    conn.prepare(query);
    conn.exec()
      .then(function(results) {
        // console.log(results);
      });
    // if (conn.num_rows() > 0) {
    //   classname = get_class(this);
    //   results = [];
    //   while (row = conn.fetch_assoc()) {
    //     obj = new global[classname]();
    //     obj.findById(row[this.primaryKey]);
    //     results.push(obj);
    //   }
    //   ret = results;
    // }
    // conn.free_result();

    Db.closeConnection(conn);

    return ret;
  },

  /**
   *  @fn findAll(params)
   *  @short Returns an array of model objects that satisfy the requirements expressed in the <tt>params</tt> argument.
   *  @details This method lets you find all objects of this class that satisfy a custom set of requirements, which you
   *  can express by setting the following keys of the <tt>params</tt> argument:
   *  @li <tt>whereClause</tt> You can express a custom SQL WHERE expression here (e.g. `date` < '2008-05-01')
   *  @li <tt>orderBy</tt> You can express a custom SQL ORDER BY expression here (e.g. `date` DESC)
   *  @li <tt>limit</tt> You can express a custom limit for the returned results.
   *  @li <tt>start</tt> You can express a custom start for the returned results.
   *  @param params An array of parameters for the underlying SQL query.
   */
  findAll: function(params) {
    params = params || [];

    const conn = Db.getConnection();

    if (_.isEmpty(params['whereClause'])) {
      params['whereClause'] = '1';
    }
    if (_.isEmpty(params['orderBy'])) {
      params['orderBy'] = sprintf('`%s` ASC', this.primaryKey);
    }
    if (_.isEmpty(params['limit'])) {
      params['limit'] = 999;
    }
    if (_.isEmpty(params['start'])) {
      params['start'] = 0;
    }

    ret = null;

    conn.prepare(sprintf('SELECT * FROM `{1}` WHERE (1 AND (%s)) ORDER BY %s LIMIT %s, %s',
        params['whereClause'], params['orderBy'], params['start'], params['limit']),
      this._getTableName());
    conn.exec();
    
    if (conn.num_rows() > 0) {
      classname = get_class(this);
      results = [];
      while (row = conn.fetch_assoc()) {
        obj = new global[classname]();
        obj.findById(row[this.primaryKey]);
        results.push(obj);
      }
      ret = results;
    }
    conn.free_result();

    Db.closeConnection(conn);

    return ret;
  },

  /**
   *  @fn findById(id)
   *  @short Populates an object with the values of the DB row whose primary key value is <tt>id</tt>.
   *  @details This instance method populates the receiver object with the contents of the DB row whose
   *  primary key is <tt>id</tt>.
   *  @param id The primary key of the desired DB row.
   *  @return This method returns true if such row exists, false otherwise.
   */
  findById: function(id) {
    const conn = Db.getConnection();
    const self = this;

    conn.prepare(sprintf("SELECT * FROM `{1}` WHERE `%s` = '{2}' LIMIT 1", this.primaryKey),
      this._getTableName(),
      id);

    return this.initialize()
      .then(function() {
        const ret = conn.exec()
          .then(function(results) {
            if (results.length < 1) {
              throw {code: 'ENOTFOUND'};
            }
            let classname = get_class(self);
            let columns = self._getColumns(classname);
            let values = results[0];

            _.forEach(columns, function(column) {
              self.values[column] = values[column];
            });

            self._add_to_pool(classname, id, self)

            return self;
          });

        Db.closeConnection(conn);

        return ret;
      });
  },

  /**
   *  @fn countAll(params)
   *  @short Returns the count of model objects that satisfy the requirements expressed in the <tt>params</tt> argument.
   *  @details This method lets you count all objects of this class that satisfy a custom set of requirements, which you
   *  can express by setting the following keys of the <tt>params</tt> argument:
   *  @li <tt>whereClause</tt> You can express a custom SQL WHERE expression here (e.g. `date` < '2008-05-01')
   *  @param params An array of parameters for the underlying SQL query.
   */
  countAll: function(params) {
    params = params || [];

    conn = Db.getConnection();

    ret = 0;

    if (_.isEmpty(params['whereClause'])) {
      params['whereClause'] = '1';
    }
    conn.prepare(sprintf('SELECT COUNT(*) FROM `{1}` WHERE (1 AND (%s))',
        params['whereClause']),
      this._getTableName());
    result = conn.exec();

    ret = conn.fetch_array()[0];

    conn.free_result();

    Db.closeConnection(conn);

    return ret;
  },

  /**
   *  @fn save
   *  @short Requests the receiver to save its data in the bound table.
   *  @details This method has two distinct effects. If called on an object fetched
   *  from the table, it performs an <tt>UPDATE</tt> SQL statement to update the
   *  table data to the new values. If called on an object created programmatically, it
   *  performs an <tt>INSERT</tt> SQL statement, and sets the object's primary key
   *  value to the value resulting by the insert.
   *  @return This method returns true if the object has been saved successfully.
   */
  save: function() {
    conn = Db.getConnection();

    classname = get_class(this);
    columns = this._getColumns(classname);

    nonempty = [];
    for (let i = 0; i < columns.length; i++) {
      if (!_.isUndefined(this.values[columns[i]])) {
        nonempty.push(columns[i]);
      }
    }

    if (!_.isEmpty(this.values[this.primaryKey]) && _.isUndefined(this._force_create)) {
      query = "UPDATE `{1}` SET ";
      for (let i = 0; i < nonempty.length; i++) {
        query += "`{nonempty[i]}` = '{conn.escape(this.values[nonempty[i]])}'";
        if (i < nonempty.length - 1) {
          query += ", ";
        }
      }
      query += " WHERE `{this.primaryKey}` = '{2}' LIMIT 1";
      conn.prepare(query,
        this._getTableName(),
        this.values[this.primaryKey]);
      conn.exec();
    } else {
      query = (!_.isUndefined(this._ignore) ? 'INSERT IGNORE' : 'INSERT') + ' INTO `{1}` (';
      for (let i = 0; i < nonempty.length; i++) {
        query += "`{nonempty[i]}`";
        if (i < nonempty.length - 1) {
          query += ", ";
        }
      }
      query += ") VALUES (";
      for (let i = 0; i < nonempty.length; i++) {
        query += "'{conn.escape(this.values[nonempty[i]])}'";
        if (i < nonempty.length - 1) {
          query += ", ";
        }
      }
      query += ")";
      conn.prepare(query,
        this._getTableName());
      conn.exec();
      this.values[this.primaryKey] = conn.insert_id();
    }

    Db.closeConnection(conn);

    return true;
  },

  /**
   *  @fn delete(optimize)
   *  @short Deletes an object's DB counterpart.
   *  @details This method performs a <tt>DELETE</tt> SQL statement on the
   *  table bound to the receiver's class, requesting the deletion of the object whose
   *  primary key is equal to the receiver's primary key value. If the object has been
   *  created programmatically and lacks a primary key value, this method has no effect.
   *  @param bool cleanup Set to <tt>false</tt> if you do not want the table to be optimized after deletion.
   */
  delete: function(optimize) {
    if (optimize === undefined) {
      optimize = true;
    }

    conn = Db.getConnection();

    if (!_.isEmpty(this.values[this.primaryKey])) {
      conn.prepare(sprintf("DELETE FROM `{1}` WHERE `%s` = '{2}' LIMIT 1", this.primaryKey),
        this._getTableName(),
        this.values[this.primaryKey]);
      conn.exec();

      // Clean up
      if (optimize) {
        conn.prepare('OPTIMIZE TABLE `{1}`',
          this._getTableName());
        conn.exec();
      }
    }

    Db.closeConnection(conn);
  },

  /**
   *  @fn relativeUrl
   *  @short Provides a relative URL that will be used by the <tt>permalink</tt> public method.
   *  @details Subclassers that wish to provide custom permalinks for objects should override this method.
   *  You should return the URL portion after the <tt>APPLICATION_ROOT</tt> part only.
   */
  relativeUrl: function() {
    return '';
  },

  /**
   *  @fn permalink(relative)
   *  @short Provides a unique permalink URL for the receiver object.
   *  @details Subclassers that wish to provide custom permalinks for objects should not override this method.
   *  Override the <tt>relativeUrl</tt> method instead.
   *  @param relative <tt>true</tt> if the permalink should not contain the protocol and domain part of the URL, <tt>false</tt> if you
   *  want them.
   */
  permalink: function(relative) {
    if (relative === undefined) {
      relative = true;
    }

    relativeUrl = this.relativeUrl();
    return relative ?
      sprintf('%s%s',
        APPLICATION_ROOT,
        relativeUrl) :
      sprintf('http://%s%s%s',
        _SERVER['HTTP_HOST'],
        APPLICATION_ROOT,
        relativeUrl);
  },

  /*
  function __call(method, args)
  {
    echo "Unknown call of method with arguments " + var_export(args, true);
  }
  */

  /**
   *  @fn set(key, value)
   *  @short Magic method to set the value of a property.
   *  @param key The key of the property.
   *  @param value The value of the property.
   */
  set: function(key, value) {
    const self = this;

    return this.initialize()
      .then(function() {
        if (self._hasColumn(key)) {
          self.values[key] = value;
        } else {
          self.key = value;
        }
      });
  },

  /**
   *  @fn get(key)
   *  @short Magic method to get the value of a property.
   *  @param key The key of the desired property.
   */
  get: function(key) {
    const self = this;

    return this.initialize()
      .then(function() {
        if (!_.isUndefined(self.values[key])) {
          return self.values[key];
        } else if (!_.isUndefined(self.key)) {
          return self.key;
        } else {
          return null;
        }
      });
  },

  /**
   *  @fn has(key)
   *  @short Magic method to determine if a property exists.
   *  @param key The key to test.
   */
  has: function(key) {
    const self = this;

    return this.initialize()
      .then(function() {
        if (_.isUndefined(self.values) || _.isEmpty(self.values)) {
          return false;
        }
        if (!_.isUndefined(self.values[key])) {
          return true;
        } else if (!_.isUndefined(self.key)) {
          return true;
        }
        return false;
      });
  },

  /**
   *      @fn __unset(key)
   *      @short Magic method to unset a property.
   *      @param key The key to unset.
   */
  unset: function(key) {
    const self = this;

    return this.initialize()
      .then(function() {
        if (_.isUndefined(self.values) || _.isEmpty(self.values)) {
          return;
        }
        if (!_.isUndefined(self.values[key])) {
          delete self.values[key];
        } else if (!_.isUndefined(self.key)) {
          delete self.key;
        }
      });
  },

  /**
   *  @fn _setInitialized(classname, initialized)
   *  @short Marks the class <tt>classname</tt> as initialized.
   *  @details This method allows Model to keep track of what subclasses have already been
   *  initialized by inspectioning the bound DB table schema, whithout the need for a per-class
   *  initialization method.
   *  @param classname The name of the class that should be marked as initialized
   *  @param initialized <tt>true</tt> if the class should be considered initialized, <tt>false</tt> otherwise.
   */
  _setInitialized: function(classname, initialized) {
    this._classInitialized[classname] = initialized;
  },

  /**
   *  @fn _isInitialized(classname)
   *  @short Tells whether the class <tt>classname</tt> has already been initialized.
   *  @param classname The name of the class that you want to inspect.
   *  @return <tt>true</tt> if the class has been initialized, <tt>false</tt> otherwise.
   */
  _isInitialized: function(classname) {
    if (_.isUndefined(this._classInitialized[classname])) {
      return false;
    }
    return this._classInitialized[classname];
  },

  /**
   *  @fn _set_columns(classname, cols)
   *  @short Stores the columns for the desired class.
   *  @param classname Name of the class for the desired object.
   *  @param cols The columns of the model object.
   */
  _set_columns: function(classname, cols) {
    this.columns[classname] = cols;
  },

  /**
   *  @fn _getColumns(classname)
   *  @short Returns the columns for the desired class.
   *  @param classname Name of the class for the desired object.
   */
  _getColumns: function(classname) {
    if (_.isUndefined(this._classInitialized[classname])) {
      return null;
    }
    return this.columns[classname];
  },

  /**
   *  @fn _add_to_pool(classname, id, obj)
   *  @short Adds an object to the object pool.
   *  @param classname Name of the class for the desired object.
   *  @param id Primary key value for the desired object.
   *  @param obj The object to add to the pool.
   */
  _add_to_pool: function(classname, id, obj) {
    if (_.isUndefined(this.objectPool[classname])) {
      this.objectPool[classname] = [];
    }
    this.objectPool[classname][id] = obj;
  },

  /**
   *  @fn _get_from_pool(classname, id)
   *  @short Retrieves an object from the object pool.
   *  @param classname Name of the class for the desired object.
   *  @param id Primary key value for the desired object.
   */
  _get_from_pool: function(classname, id) {
    if (_.isUndefined(this.objectPool[classname]) ||
      _.isUndefined(this.objectPool[classname][id])) {
      return null;
    }
    return this.objectPool[classname][id];
  }
});

_.assign(Model, {

  _registry: {
    model: Model
  },

  /**
   *  @fn create(name)
   *  @short Returns a constructor for a subclass of <tt>Model</tt>.
   *  @details Use this static method to create a subclass of <tt>Model</tt> that
   *  maps to a different DB table.
   *  @param name The name of the model to represent with this subclass.
   */
  create: function(name) {
    name = (name || 'model').toLowerCase();

    if (_.isUndefined(this._registry[name])) {
      const constructor = function(values) {
        this.construct(values);
      };

      _.extend(constructor.prototype, Model.prototype, {
        __cls: table_name_to_class_name(pluralize(name))
      });

      this._registry[name] = constructor;
    }

    return this._registry[name];
  },

  /**
   *  @fn find(id, name)
   *  @short Returns an object whose primary key value is <tt>id</tt>.
   *  @details Due to current limitations, a static method always applies to the
   *  superclass. We have to explicitly pass the name of the subclass in order to
   *  @param id The value of the primary key.
   *  @param name The name of the model to apply this static method to.
   *  @returns a promise that will be resolved with the desired object
   */
  find: function(id, name) {
    name = (name || 'model').toLowerCase();

    let constructor = Model.create(name);

    return new constructor().findById(id);
  }
});

module.exports.Model = Model;
