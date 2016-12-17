'use strict';

const _ = require('lodash'),
  Promise = require('bluebird'),
  sprintf = require('sprintf-js').sprintf,
  Db = require('./db'),
  utils = require('./utils'),
  class_name_to_table_name = utils.class_name_to_table_name,
  class_name_to_foreign_key = utils.class_name_to_foreign_key,
  table_name_to_class_name = utils.table_name_to_class_name,
  table_name_to_foreign_key = utils.table_name_to_foreign_key;

function get_class(obj) {
  return obj.__cls;
}

/**
 *  @class ActiveRecord
 *  @short The abstract base class for DB-backed model objects.
 *  @details Every object of a subclass of ActiveRecord are mapped 1:1 to records of a table in
 *  a relational Database. Naming conventions assume that if the ActiveRecord subclass is called
 *  <tt>MyProduct</tt>, database records are stored in a table called <tt>my_products</tt>.
 *  Conversely, if an object of another class is in a relation with your object, it is assumed that a
 *  foreign key called <tt>my_product_id</tt> exists in the other table. Of course this is overridable
 *  by setting explicitly <tt>table_name</tt> and <tt>foreign_key</tt> to a value of your choice.
 */

/**
 *  @fn Model(_values)
 *  @short Constructs and initializes an ActiveRecord object.
 *  @details Due to the lack of a static class initialization method,
 *  the default constructor is in charge of gathering information about
 *  the bound table columns the first time an object is created. Subsequent
 *  creations will use the values stored in static class variables.
 *  Subclassers don't need to override the constructor. They can in turn
 *  override the <tt>init</tt> method in order to perform custom initialization.
 *  @param values Column values to initialize the object.
 */
function Model(_values) {
  this.values = [];

  if (!_.isEmpty(_values)) {
    const classname = get_class(this);
    const self = this;
    this.initialize().then(function() {
        let columns = self._get_columns(classname);

        _.forEach(_values, function(val, key) {
          let keyexists = _.includes(columns, key);
          if (keyexists) {
            self.values[key] = val;
          }
        });
        self.init(_values);
      });
  }
}

_.assign(Model.prototype, {

  initialize: function() {
    const classname = get_class(this);
    const self = this;

    let initialized = this._is_initialized(classname);

    if (!initialized) {
      const conn = Db.getConnection();
      conn.prepare('DESCRIBE `{1}`',
        this._getTableName());
      initialized = conn.exec()
        .then(function(results) {
          let columns = [];

          _.forEach(results, function(row) {
            columns.push(row['Field']);
          });

          self._set_columns(classname, columns);

          Db.closeConnection(conn);
        });

      self._set_initialized(classname, initialized);
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
   *  @attr class_initialized
   *  @short Array containing initialization information for subclasses.
   */
  class_initialized: [],

  /**
   *  @attr belongsTo_classes
   *  @short Array containing information on parent tables for subclasses.
   */
  belongsTo_classes: [],

  /**
   *  @attr hasMany_classes
   *  @short Array containing information on child tables for subclasses.
   */
  hasMany_classes: [],

  /**
   *  @attr object_pool
   *  @short Pool of objects already fetched from database.
   */
  object_pool: [],

  /**
   *  @attr table_name
   *  @short Name of the table bound to this model class.
   */
  table_name: null,

  /**
   *  @attr primary_key
   *  @short Name of the primary key column for the bound table.
   *  @details Set this attribute only when the primary key of the bound table is not the canonical <tt>id</tt>.
   */
  primary_key: 'id',

  /**
   *  @attr foreign_key_name
   *  @short Used to create the name of foreign key column in tables that are in a relationship with the bound table.
   *  @details Set this attribute only when the foreign key that references objects of this class
   *  is not the canonical name (e.g. 'product' for class Product).
   */
  foreign_key_name: null,

  /**
   *  @attr values
   *  @short Array of values for the columns of model object.
   */
  values: null,

  /**
   *  @fn init(values)
   *  @short Performs specialized initialization tasks.
   *  @details Subclassers will use this method to perform custom initialization.
   *  @note The default implementation simply does nothing.
   *  @param values An array of column-value pairs to initialize the receiver.
   */
  init: function(values) {},

  /**
   *  @fn get_table_name
   *  @short Returns the name of the table bound to this class.
   *  @details This method returns the name of the table which contains
   *  data for objects of this class. If the ActiveRecord subclass is called <tt>MyRecord</tt>,
   *  the table name will be <tt>my_records</tt>. Of course you can override this behavior by
   *  setting explicitly the value of <tt>table_name</tt> in the declaration of your class.
   */
  _getTableName: function() {
    if (!this.table_name) {
      let classname = get_class(this);
      this.table_name = class_name_to_table_name(classname);
    }
    return this.table_name;
  },

  /**
   *  @fn get_foreign_key_name
   *  @short Returns the name of the foreign key for this class.
   *  @details This method returns the name of the column to lookup when considering relations
   *  with objects of this class. If the ActiveRecord subclass is called <tt>MyRecord</tt>,
   *  the foreign key name will be <tt>my_record_id</tt>. Of course you can override this behavior by
   *  setting explicitly the value of <tt>foreign_key_name</tt> in the declaration of your class.
   */
  _get_foreign_key_name: function() {
    if (_.isEmpty(this.foreign_key_name)) {
      classname = get_class(this);
      this.foreign_key_name = class_name_to_foreign_key(classname);
    }
    return this.foreign_key_name;
  },

  /**
   *  @fn get_primary_key
   *  @short Returns the name of the primary key for this class.
   *  @details This method returns the name of the primary key in the table bound to this class.
   *  By default, ActiveRecord considers as primary key a column named <tt>id</tt>. Of course you can override
   *  this behavior by setting explicitly the value of <tt>primary_key</tt> in the declaration of your class.
   */
  _get_primary_key: function() {
    if (!this.primary_key) {
      this.primary_key = 'id';
    }
    return this.primary_key;
  },

  /**
   *  @fn _hasColumn(key)
   *  @short Verifies the existence of a column named <tt>key</tt> in the bound table.
   *  @param key The name of the column to check.
   */
  _hasColumn: function(key) {
    let classname = get_class(this);
    let columns = this._get_columns(classname);
    return in_array(key, columns);
  },

  /**
   *  @fn belongsTo(table_name)
   *  @short Loads the parent of the receiver in a one-to-many relationship.
   *  @param table_name The name of the parent table.
   */
  belongsTo: function(table_name) {
    let classname = get_class(this);
    let columns = this._get_columns(classname);
    let ownerclass = table_name_to_class_name(table_name);
    let owner = new global[ownerclass]();
    if (in_array(table_name_to_foreign_key(table_name), columns)) {
      owner.findById(this.values[table_name_to_foreign_key(table_name)]);
    } else if (in_array(owner.foreign_key_name, columns)) {
      owner.findById(this.values[owner.foreign_key_name]);
    }
    this.values[singularize(table_name)] = owner;
    owner.values[singularize(this.table_name)] = this;
  },

  /**
   *  @fn hasMany(table_name, params)
   *  @short Loads the children of the receiver in a one-to-many relationship.
   *  @param table_name The name of the child table.
   *  @param params An array of conditions. For the semantics, see findAll
   *  @see findAll
   */
  hasMany: function(table_name, params) {
    params = params || [];

    let childclass = table_name_to_class_name(table_name);
    let obj = new global[childclass]();
    let fkey = this.get_foreign_key_name();
    if (!_.isUndefined(params['where_clause'])) {
      params['where_clause'] = sprintf("(%s) AND `%s` = '%s' ", params['where_clause'], fkey, this.values[this.primary_key]);
    } else {
      params['where_clause'] = sprintf("`%s` = '%s' ", fkey, this.values[this.primary_key]);
    }
    children = obj.findAll(params);
    if (children.length > 0) {
      let self = this;
      _.forEach(children, function(child) {
        child.values[singularize(self.table_name)] = self;
      });
      this.values[table_name] = children;
    }
  },

  /**
   *  @fn hasAndBelongsToMany(table_name, params)
   *  @short Loads the object network the receiver belongs to in a many-to-many relationship.
   *  @param table_name The name of the peer table.
   *  @param params An array of conditions. For the semantics, see findAll
   *  @see findAll
   */
  hasAndBelongsToMany: function(table_name, params) {
    params = params || [];

    const conn = Db.getConnection();

    let peerclass = table_name_to_class_name(table_name);
    let peer = new global[peerclass]();
    fkey = this.get_foreign_key_name();
    peer_fkey = peer.get_foreign_key_name();

    // By convention, relation table name is the union of
    // the two member tables' names joined by an underscore
    // in alphabetical order
    table_names = [table_name, this.table_name];
    table_names.sort();
    relation_table = table_names.join('_');

    conn.prepare("SELECT * FROM `{1}` WHERE `{2}` = '{3}'",
      relation_table,
      fkey,
      this.values[this.primary_key]);

    let self = this;
    conn.exec()
      .then(function(results) {
        // if (conn.num_rows() > 0) {
        //   self.values[table_name] = [];
        //   while (row = conn.fetch_assoc()) {
        //     peer = new global[peerclass]();
        //     peer.findById(row[peer_fkey]);
        //     self.values[table_name].push(peer);
        //     peer.values[self.table_name] = [self];
        //     //print_r(peer);
        //   }
        // }
        // conn.free_result();
      });

    // if (conn.num_rows() > 0) {
    //   this.values[table_name] = [];
    //   while (row = conn.fetch_assoc()) {
    //     peer = new global[peerclass]();
    //     peer.findById(row[peer_fkey]);
    //     this.values[table_name].push(peer);
    //     peer.values[this.table_name] = array(this);
    //     //print_r(peer);
    //   }
    // }
    // conn.free_result();

    Db.closeConnection(conn);
  },

  /**
   *  @fn hasOne(table_name)
   *  @short Loads the child the receiver in a one-to-one relationship.
   *  @param table_name The name of the child table.
   *  @param params An array of conditions. For the semantics, see findAll
   *  @see findAll
   */
  hasOne: function(table_name) {
    childclass = table_name_to_class_name(table_name);
    obj = new global[childclass]();
    fkey = this.get_foreign_key_name();
    children = obj.findAll({
        'where_clause': sprintf("`%s` = '%s'", fkey, this.values[this.primary_key]),
        'limit': 1
      });
    if (children.length > 0) {
      child = children[0];
      child.values[singularize(this.table_name)] = this;
      this.values[singularize(table_name)] = child;
    }
  },

  /**
   *  Finder methods
   */

  /**
   *  @fn findByQuery(query)
   *  @short Returns an array of model objects by executing a custom SELECT query.
   *  @details This is a powerful instance method to retrieve objects from the database with a custom query.
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
    //     obj.findById(row[this.primary_key]);
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
   *  @li <tt>where_clause</tt> You can express a custom SQL WHERE expression here (e.g. `date` < '2008-05-01')
   *  @li <tt>order_by</tt> You can express a custom SQL ORDER BY expression here (e.g. `date` DESC)
   *  @li <tt>limit</tt> You can express a custom limit for the returned results.
   *  @li <tt>start</tt> You can express a custom start for the returned results.
   *  @param params An array of parameters for the underlying SQL query.
   */
  findAll: function(params) {
    params = params || [];

    const conn = Db.getConnection();

    if (_.isEmpty(params['where_clause'])) {
      params['where_clause'] = '1';
    }
    if (_.isEmpty(params['order_by'])) {
      params['order_by'] = sprintf('`%s` ASC', this.primary_key);
    }
    if (_.isEmpty(params['limit'])) {
      params['limit'] = 999;
    }
    if (_.isEmpty(params['start'])) {
      params['start'] = 0;
    }

    ret = null;

    conn.prepare(sprintf('SELECT * FROM `{1}` WHERE (1 AND (%s)) ORDER BY %s LIMIT %s, %s', params['where_clause'], params['order_by'], params['start'], params['limit']),
      this._getTableName());
    conn.exec();
    
    if (conn.num_rows() > 0) {
      classname = get_class(this);
      results = [];
      while (row = conn.fetch_assoc()) {
        obj = new global[classname]();
        obj.findById(row[this.primary_key]);
        results.push(obj);
      }
      ret = results;
    }
    conn.free_result();

    Db.closeConnection(conn);

    return ret;
  },

  /**
   *  @fn find(id, classname)
   *  @short Returns an object whose primary key value is <tt>id</tt>.
   *  @details Due to limitations of PHP, a static method always apply to the
   *  superclass. We have to explicitly reference the name of the subclass in order to
   *  create the right object.
   *  @param id The value of the primary key.
   *  @param classname The name of the subclass to apply this static method to.
   */
  find: function(id, classname) {
    classname = classname || 'ActiveRecord';

    obj = new global[classname]();
    obj.findById(id);
    return obj;
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

    conn.prepare(sprintf("SELECT * FROM `{1}` WHERE `%s` = '{2}' LIMIT 1", this.primary_key),
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
            let columns = self._get_columns(classname);
            let values = results[0]; //conn.fetch_assoc()

            _.forEach(columns, function(column) {
              self.values[column] = values[column];
            })

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
   *  @li <tt>where_clause</tt> You can express a custom SQL WHERE expression here (e.g. `date` < '2008-05-01')
   *  @param params An array of parameters for the underlying SQL query.
   */
  countAll: function(params) {
    params = params || [];

    conn = Db.getConnection();

    ret = 0;

    if (_.isEmpty(params['where_clause'])) {
      params['where_clause'] = '1';
    }
    conn.prepare(sprintf('SELECT COUNT(*) FROM `{1}` WHERE (1 AND (%s))',
        params['where_clause']),
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
    columns = this._get_columns(classname);

    nonempty = [];
    for (let i = 0; i < columns.length; i++) {
      if (!_.isUndefined(this.values[columns[i]])) {
        nonempty.push(columns[i]);
      }
    }

    if (!_.isEmpty(this.values[this.primary_key]) && _.isUndefined(this._force_create)) {
      query = "UPDATE `{1}` SET ";
      for (let i = 0; i < nonempty.length; i++) {
        query += "`{nonempty[i]}` = '{conn.escape(this.values[nonempty[i]])}'";
        if (i < nonempty.length - 1) {
          query += ", ";
        }
      }
      query += " WHERE `{this.primary_key}` = '{2}' LIMIT 1";
      conn.prepare(query,
        this._getTableName(),
        this.values[this.primary_key]);
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
      this.values[this.primary_key] = conn.insert_id();
    }

    Db.closeConnection(conn);

    return true;
  },

  /**
   *  @fn delete(optimize)
   *  @short Deletes an object's database counterpart.
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

    if (!_.isEmpty(this.values[this.primary_key])) {
      conn.prepare(sprintf("DELETE FROM `{1}` WHERE `%s` = '{2}' LIMIT 1", this.primary_key),
        this._getTableName(),
        this.values[this.primary_key]);
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
   *  @fn relative_url
   *  @short Provides a relative URL that will be used by the <tt>permalink</tt> public method.
   *  @details Subclassers that wish to provide custom permalinks for objects should override this method.
   *  You should return the URL portion after the <tt>APPLICATION_ROOT</tt> part only.
   */
  relative_url: function() {
    return '';
  },

  /**
   *  @fn permalink(relative)
   *  @short Provides a unique permalink URL for the receiver object.
   *  @details Subclassers that wish to provide custom permalinks for objects should not override this method.
   *  Override the <tt>relative_url</tt> method instead.
   *  @param relative <tt>true</tt> if the permalink should not contain the protocol and domain part of the URL, <tt>false</tt> if you
   *  want them.
   */
  permalink: function(relative) {
    if (relative === undefined) {
      relative = true;
    }

    relative_url = this.relative_url();
    return relative ?
      sprintf('%s%s',
        APPLICATION_ROOT,
        relative_url) :
      sprintf('http://%s%s%s',
        _SERVER['HTTP_HOST'],
        APPLICATION_ROOT,
        relative_url);
  },

  /*
  function __call(method, args)
  {
    echo "Unknown call of method with arguments " + var_export(args, true);
  }
  */

  /**
   *  @fn __set(key, value)
   *  @short Magic method to set the value of a property.
   *  @param key The key of the property.
   *  @param value The value of the property.
   */
  __set: function(key, value) {
    if (this.hasColumn(key)) {
      this.values[key] = value;
    } else {
      this.key = value;
    }
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
        }
      });
  },

  /**
   *  @fn __!_.isUndefined(key)
   *  @short Magic method to determine if a property exists.
   *  @param key The key to test.
   */
  __isset: function(key) {
    if (!(!_.isUndefined(this.values) && !_.isEmpty(this.values))) {
      return false;
    }
    if (array_key_exists(key, this.values)) {
      return true;
    } else if (!_.isUndefined(this.key)) {
      return true;
    }
    return false;
  },

  /**
   *      @fn __unset(key)
   *      @short Magic method to unset a property.
   *      @param key The key to unset.
   */
  __unset: function(key) {
    if (!(!_.isUndefined(this.values) && !_.isEmpty(this.values))) {
      return;
    }
    if (array_key_exists(key, this.values)) {
      unset(this.values[key]);
    } else if (!_.isUndefined(this.key)) {
      unset(this.key);
    }
  },

  /**
   *  @fn _set_initialized(classname, initialized)
   *  @short Marks the class <tt>classname</tt> as initialized.
   *  @details This method allows ActiveRecord to keep track of what subclasses have already been
   *  initialized by inspectioning the bound database table schema, whithout the need for a per-class
   *  initialization method.
   *  @param classname The name of the class that should be marked as initialized
   *  @param initialized <tt>true</tt> if the class should be considered initialized, <tt>false</tt> otherwise.
   */
  _set_initialized: function(classname, initialized) {
    this.class_initialized[classname] = initialized;
  },

  /**
   *  @fn _is_initialized(classname)
   *  @short Tells whether the class <tt>classname</tt> has already been initialized.
   *  @param classname The name of the class that you want to inspect.
   *  @return <tt>true</tt> if the class has been initialized, <tt>false</tt> otherwise.
   */
  _is_initialized: function(classname) {
    if (_.isUndefined(this.class_initialized[classname])) {
      return false;
    }
    return this.class_initialized[classname];
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
   *  @fn _get_columns(classname)
   *  @short Returns the columns for the desired class.
   *  @param classname Name of the class for the desired object.
   */
  _get_columns: function(classname) {
    if (_.isUndefined(this.class_initialized[classname])) {
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
    if (_.isUndefined(this.object_pool[classname])) {
      this.object_pool[classname] = [];
    }
    this.object_pool[classname][id] = obj;
  },

  /**
   *  @fn _get_from_pool(classname, id)
   *  @short Retrieves an object from the object pool.
   *  @param classname Name of the class for the desired object.
   *  @param id Primary key value for the desired object.
   */
  _get_from_pool: function(classname, id) {
    if (_.isUndefined(this.object_pool[classname]) ||
      _.isUndefined(this.object_pool[classname][id])) {
      return null;
    }
    return this.object_pool[classname][id];
  }
});

_.assign(Model, {
  extend: function(table_name) {

  }
});

module.exports.Model = Model;
