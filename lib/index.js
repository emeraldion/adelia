'use strict';

const _ = require('lodash'),
  Promise = require('bluebird'),
  sprintf = require('sprintf-js').sprintf,
  Db = require('./db'),
  utils = require('./utils'),

  pluralize = utils.pluralize,
  singularize = utils.singularize,
  class_name_to_table_name = utils.class_name_to_table_name,
  class_name_to_foreign_key = utils.class_name_to_foreign_key,
  table_name_to_class_name = utils.table_name_to_class_name,
  table_name_to_foreign_key = utils.table_name_to_foreign_key;

function get_class(obj) {
  return obj.constructor.__cls;
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
   *  @fn construct(values)
   *  @short Constructs an instance of the model class.
   *  @details If invoked with arguments, the constructor will initialize
   *  the class and set the values in the <tt>values</tt> map.
   *  @param values A map of values used to initialize this instance
   */
  construct: function(values) {
    this.values = {};
  
    if (!_.isEmpty(values)) {
      const classname = get_class(this);
      const self = this;

      this.initialize().then(function() {
        const columns = self._getColumns(classname);

        _.forEach(values, function(val, key) {
          const keyexists = _.includes(columns, key);

          if (keyexists) {
            self.values[key] = val;
          }
        });
        self.init(values);
      });
    }
  },

  /**
   *  @fn initialize
   *  @short Performs basic initialization of this class.
   *  @details Methods that need access to DB APIs must invoke this thenable
   *  method to chain code that requires introspection of the model schema
   *  @returns a thenable promise
   */
  initialize: function() {
    const classname = get_class(this);
    const self = this;

    let initialized = this._isInitialized(classname);

    if (!initialized) {
      const conn = Db.getConnection();

      initialized = conn.getColumns(this._getTableName())
        .then(function(columns) {
          self._setColumns(classname, columns);
        })
        // .finally(function() {
        //   Db.closeConnection(conn);
        // });
        .then(function() {
          Db.closeConnection(conn);
          return arguments;
        }, function(e) {
          Db.closeConnection(conn);
          throw e;
        });

      self._setInitialized(classname, initialized);
    }

    return initialized;
  },

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
      const classname = get_class(this);

      this.tableName = class_name_to_table_name(classname);
    }

    return this.tableName;
  },

  /**
   *  @fn _getForeignKeyName
   *  @short Returns the name of the foreign key for this class.
   *  @details This method returns the name of the column to lookup when considering relations
   *  with objects of this class. If the Model subclass is called <tt>MyRecord</tt>,
   *  the foreign key name will be <tt>my_record_id</tt>. Of course you can override this behavior by
   *  setting explicitly the value of <tt>foreignKeyName</tt> in the declaration of your class.
   */
  _getForeignKeyName: function() {
    if (_.isEmpty(this.foreignKeyName)) {
      const classname = get_class(this);

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
    const classname = get_class(this);
    const columns = this._getColumns(classname);

    return !_.isUndefined(columns[key]);
  },

  /**
   *  @fn belongsTo(kind)
   *  @short Loads the parent of the receiver in a one-to-many relationship.
   *  @param kind The name of the associated model, in singular form.
   */
  belongsTo: function(kind) {
    const classname = get_class(this);
    const columns = this._getColumns(classname);
    const owner = new (Model.create(kind))();
    const self = this;

    return this.initialize()
      .then(function() {
        const fkey = _.includes(columns, table_name_to_foreign_key(pluralize(kind))) ?
          table_name_to_foreign_key(pluralize(kind)) : owner.foreignKeyName;

        return owner.findById(self.values[fkey])
          .then(function(owner) {
            self.values[kind] = owner;
            owner.values[singularize(self.tableName)] = self;

            return owner;
          });
      });
  },

  /**
   *  @fn hasMany(kinds, params)
   *  @short Loads the children of the receiver in a one-to-many relationship.
   *  @param kinds The name of the associated models, in plural form.
   *  @param params An array of conditions. For the semantics, see findAll
   *  @see findAll
   */
  hasMany: function(kinds, params) {
    params = params || [];

    const kind = singularize(kinds);
    const obj = new (Model.create(kind))();
    const fkey = this._getForeignKeyName();
    const self = this;

    if (!_.isUndefined(params['whereClause'])) {
      params.whereClause = sprintf("(%s) AND `%s` = '%s' ", params['whereClause'], fkey, this.values[this.primaryKey]);
    } else {
      params.whereClause = sprintf("`%s` = '%s' ", fkey, this.values[this.primaryKey]);
    }

    return obj.findAll(params)
      .then(function(children) {
        if (children.length > 0) {
          _.forEach(children, function(child) {
            child.values[singularize(self.tableName)] = self;
          });
          self.values[kinds] = children;
        }

        return children;
      });
  },

  /**
   *  @fn hasAndBelongsToMany(kinds, params)
   *  @short Loads the object network the receiver belongs to in a many-to-many relationship.
   *  @param kinds The name of the associated models, in plural form.
   *  @param params An array of conditions. For the semantics, see findAll
   *  @see findAll
   */
  hasAndBelongsToMany: function(kinds, params) {
    params = params || [];

    const conn = Db.getConnection();

    const kind = singularize(kinds);
    const peer = new (Model.create(kind))();
    const fkey = this._getForeignKeyName();
    const peer_fkey = peer._getForeignKeyName();
    const self = this;

    // By convention, relation table name is the union of
    // the two member tables' names joined by an underscore
    // in alphabetical order
    const tableNames = [kinds, this.tableName];
    tableNames.sort();
    const relationTableName = tableNames.join('_');

    return this.initialize()
      .then(function() {
        return conn.prepare("SELECT * FROM `{1}` WHERE `{2}` = '{3}'",
          relationTableName, fkey, self.values[self.primaryKey]);
      })
      .then(function() {
        return conn.exec();
      })
      .then(function(results) {
        if (results.length > 0) {
          self.values[kinds] = [];

          return Promise.all(_.map(results, function(row) {
            const peer = new (Model.create(kind))();

            return peer.findById(row[peer_fkey])
              .then(function(peer) {
                self.values[kinds].push(peer);
                peer.values[self.tableName] = [self];

                return peer;
              });
          }));
        }

        return null;
      })
      // .finally(function() {
      //   Db.closeConnection(conn);
      // });
      .then(function(peer) {
        Db.closeConnection(conn);
        return peer;
      }, function(e) {
        Db.closeConnection(conn);
        throw e;
      });
  },

  /**
   *  @fn hasOne(kind)
   *  @short Loads the child the receiver in a one-to-one relationship.
   *  @param kind The name of the associated kind, in singular form.
   *  @param params An array of conditions. For the semantics, see findAll
   *  @see findAll
   */
  hasOne: function(kind) {
    const obj = new (Model.create(kind))();
    const fkey = this._getForeignKeyName();
    const self = this;
    
    return obj.findAll({
        'whereClause': sprintf("`%s` = '%s'", fkey, this.values[this.primaryKey]),
        'limit': 1
      })
      .then(function(children) {
        if (children.length > 0) {
          const child = children[0];

          child.values[singularize(self.tableName)] = self;
          self.values[kind] = child;

          return child;
        }

        return null;
      });
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
    const conn = Db.getConnection();
    const self = this;

    let ret = null;

    return this.initialize()
      .then(function() {
        return conn.prepare(query);
      })
      .then(function(query) {
        return conn.exec();
      })
      .then(function(results) {
        const classname = get_class(self);
        return results.length > 0 ?
          Promise.all(_.map(results, row => {
            const obj = new (Model.create(classname))();
            return obj.findById(row[self.primaryKey]);
          })) : null;
      })
      // .finally(function() {
      //   Db.closeConnection(conn);
      // });
      .then(function(results) {
        Db.closeConnection(conn);
        return results;
      }, function(e) {
        Db.closeConnection(conn);
        throw e;
      });
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
    const self = this;

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

    return this.initialize()
      .then(function() {
        return conn.prepare(sprintf('SELECT * FROM `{1}` WHERE (1 AND (%s)) ORDER BY %s LIMIT %s, %s',
            params['whereClause'], params['orderBy'], params['start'], params['limit']),
          self._getTableName());
      })
      .then(function() {
        return conn.exec();
      })
      .then(function(results) {
        if (results.length > 0) {
          const classname = get_class(self);

          return Promise.all(_.map(results, function(row) {
            const obj = new (Model.create(classname))();
            return obj.findById(row[self.primaryKey]);
          }));
        }

        return null;
      })
      // .finally(function() {
      //   Db.closeConnection(conn);
      // });
      .then(function(results) {
        Db.closeConnection(conn);
        return results;
      }, function(e) {
        Db.closeConnection(conn);
        throw e;
      });
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

    return this.initialize()
      .then(function() {
        return conn.prepare(sprintf("SELECT * FROM `{1}` WHERE `%s` = '{2}' LIMIT 1", self.primaryKey),
          self._getTableName(), id);
      })
      .then(function() {
        return conn.exec();
      })
      .then(function(results) {
        if (results.length < 1) {
          throw {code: 'ENOTFOUND'};
        }
        const classname = get_class(self);
        const columns = self._getColumns(classname);
        const values = results[0];

        _.forEach(columns, function(column) {
          self.values[column] = values[column];
        });

        self._add_to_pool(classname, id, self);

        return self;
      })
      // .finally(function() {
      //   Db.closeConnection(conn);
      // });
      .then(function(result) {
        Db.closeConnection(conn);
        return result;
      }, function(e) {
        Db.closeConnection(conn);
        throw e;
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
    if (_.isEmpty(params['whereClause'])) {
      params['whereClause'] = '1';
    }

    const conn = Db.getConnection();
    const self = this;

    return this.initialize()
      .then(function() {
        return conn.prepare(sprintf('SELECT COUNT(*) AS `count` FROM `{1}` WHERE (1 AND (%s))',
            params['whereClause']),
          self._getTableName());
      })
      .then(function(query) {
        return conn.exec();
      })
      .then(function(result) {
        return _.first(result).count;
      })
      // .finally(function() {
      //   Db.closeConnection(conn);
      // });
      .then(function(result) {
        Db.closeConnection(conn);
        return result;
      }, function(e) {
        Db.closeConnection(conn);
        throw e;
      });
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
    const conn = Db.getConnection();
    const self = this;
    const classname = get_class(this);

    return this.initialize()
      .then(function() {
        const columns = self._getColumns(classname);
        const nonempty = [];
        let query;

        for (let i = 0; i < columns.length; i++) {
          if (!_.isUndefined(self.values[columns[i]])) {
            nonempty.push(columns[i]);
          }
        }

        if (!_.isUndefined(self.values[self.primaryKey]) && _.isUndefined(self._force_create)) {
          query = "UPDATE `{1}` SET ";
          for (let i = 0; i < nonempty.length; i++) {
            query += sprintf("`%s` = '%s'", nonempty[i], self.values[nonempty[i]]);
            if (i < nonempty.length - 1) {
              query += ", ";
            }
          }
          query += sprintf(" WHERE `%s` = '{2}'"/* LIMIT 1"*/, self.primaryKey);

          return conn.prepare(query, self._getTableName(), self.values[self.primaryKey]);
        }

        query = (!_.isUndefined(self._ignore) ? 'INSERT IGNORE' : 'INSERT') + ' INTO `{1}` (';
        for (let i = 0; i < nonempty.length; i++) {
          query += sprintf("`%s`", nonempty[i]);
          if (i < nonempty.length - 1) {
            query += ", ";
          }
        }
        query += ") VALUES (";
        for (let i = 0; i < nonempty.length; i++) {
          query += sprintf("'%s'", self.values[nonempty[i]]);
          if (i < nonempty.length - 1) {
            query += ", ";
          }
        }
        query += ")";

        return conn.prepare(query, self._getTableName());
      })
      .then(function() {
        return conn.exec();
      })
      .then(function(result) {
        // FIXME: move to adapter
        if (!_.isUndefined(result.insertId) && result.insertId !== 0) {
          self.values[self.primaryKey] = result.insertId;
        }

        return self;
      })
      // .finally(function() {
      //   Db.closeConnection(conn);
      // });
      .then(function(result) {
        Db.closeConnection(conn);
        return result;
      }, function(e) {
        Db.closeConnection(conn);
        throw e;
      });
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

    const conn = Db.getConnection();
    const self = this;

    if (!_.isUndefined(this.values[this.primaryKey])) {
      return this.initialize()
        .then(function() {
          return conn.deleteOne(self._getTableName(), self.primaryKey, self.values[self.primaryKey], {
            optimize: optimize
          });
        })
        // .finally(function() {
        //   Db.closeConnection(conn);
        // });
        .then(function(results) {
          Db.closeConnection(conn);
          return results;
        }, function(e) {
          Db.closeConnection(conn);
          throw e;
        });
    }

    return Promise.resolve(false);
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
   *  @fn _setColumns(classname, cols)
   *  @short Stores the columns for the desired class.
   *  @param classname Name of the class for the desired object.
   *  @param cols The columns of the model object.
   */
  _setColumns: function(classname, cols) {
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

  /**
   *  @attr __cls
   *  @short Class name of this model.
   */
  __cls: 'Model',


  /**
   *  @attr _registry
   *  @short Class registry of models.
   */
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

    if (_.isUndefined(Model._registry[name])) {
      const constructor = function(values) {
        this.construct(values);
      };

      _.extend(constructor, {
        __cls: table_name_to_class_name(pluralize(name)),

        find: Model.find
      });

      _.extend(constructor.prototype, Model.prototype);

      Model._registry[name] = constructor;
    }

    return Model._registry[name];
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
    name = (name || this.__cls || 'model').toLowerCase();

    let constructor = Model.create(name);

    return new constructor().findById(id);
  }
});

module.exports.Model = Model;
