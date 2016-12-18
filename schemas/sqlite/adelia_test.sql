CREATE TABLE 'birds' (
  'id' INTEGER PRIMARY KEY AUTOINCREMENT,
  'name' TEXT(24) NOT NULL,
  'size' TEXT(12) NOT NULL,
  'person_id' INTEGER DEFAULT NULL
);

INSERT INTO 'birds' ('id', 'name', 'size', 'person_id') VALUES (1, 'Budgie', 'small', NULL);

CREATE TABLE 'books' (
  'id' INTEGER PRIMARY KEY AUTOINCREMENT,
  'title' TEXT(24) NOT NULL,
  'year' INTEGER NOT NULL
);

INSERT INTO 'books' ('id', 'title', 'year') VALUES (1, 'Arctic Ice Meltdown', 2015);
INSERT INTO 'books' ('id', 'title', 'year') VALUES (2, 'Saving The Planet', 2012);

CREATE TABLE 'books_people' (
  'person_id' INTEGER NOT NULL,
  'book_id' INTEGER NOT NULL,
  PRIMARY KEY ('person_id', 'book_id')
);

INSERT INTO 'books_people' ('person_id', 'book_id') VALUES (1, 1);
INSERT INTO 'books_people' ('person_id', 'book_id') VALUES (1, 2);
INSERT INTO 'books_people' ('person_id', 'book_id') VALUES (2, 2);

CREATE TABLE 'cats' (
  'id' INTEGER PRIMARY KEY AUTOINCREMENT,
  'name' TEXT(24) NOT NULL,
  'color' TEXT(12) NOT NULL,
  'person_id' INTEGER DEFAULT NULL
);

INSERT INTO 'cats' ('id', 'name', 'color', 'person_id') VALUES (1, 'Duchess', 'white', NULL);

CREATE TABLE 'models' (
  'id' INTEGER PRIMARY KEY AUTOINCREMENT,
  'name' TEXT(24) NOT NULL
);

INSERT INTO 'models' ('id', 'name') VALUES (1, 'Adelia');
INSERT INTO 'models' ('id', 'name') VALUES (2, 'Emperor');

CREATE TABLE 'people' (
  'id' INTEGER PRIMARY KEY AUTOINCREMENT,
  'name' TEXT(12),
  'age' INTEGER
);

INSERT INTO 'people' ('id', 'name', 'age') VALUES (1, 'Erika', 31);
INSERT INTO 'people' ('id', 'name', 'age') VALUES (2, 'Louis', 28);
