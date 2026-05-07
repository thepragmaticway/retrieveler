![Retrieveler](./retrieveler-cover.png)
# Retrieveler

Retrieveler means "data retrieval learner." The project is designed to teach data retrieval using three fundamental data structures, each organized to suit a particular type of information.

## What is Retrieveler?

Retrieveler is an intuitive learning project focused on understanding how data is stored and retrieved in different structures:

- Relational Data Structure
- Hierarchical Data Structure
- Graph Data Structure

The goal is to explore the nature of each structure and see concrete examples of how real-world data fits naturally into each form.

## Data Structure Types

### Relational Data Structure

Nature:

- Data is organized in tables with rows and columns.
- Records are related through keys.
- Best for structured records and transactions.

Concrete examples:

- A customer database with tables for `Customers`, `Orders`, and `Products`.
- Each `Order` row links to a `Customer` and one or more `Product` rows.
- SQL queries retrieve related rows across tables with `JOIN`.

When to use it:

- Business applications, finance systems, inventory management, and any data with well-defined schema.

### Hierarchical Data Structure

Nature:

- Data is organized as nested parent-child relationships.
- There is a single root and branching nodes.
- Best for tree-like documents and nested content.

Concrete examples:

- HTML, XML or JSON documents, where elements contain child elements.
- File systems, where folders contain subfolders and files.
- A family tree or human genealogy, where generations are represented as parent-child branches.
- Organization charts, where a CEO is at the root and departments branch downward.

When to use it:

- Content trees, web page DOM, configuration files, and nested object structures.

### Graph Data Structure

Nature:

- Data is organized as nodes and edges.
- Relationships are first-class objects and can be many-to-many.
- Best for complex, interconnected data.

Concrete examples:

- Social networks, where users are nodes and friendships are edges.
- Recommendation systems, where users, items, and behaviors connect in a network.
- Knowledge graphs, where concepts link to related concepts.

When to use it:

- Networks, connected data, recommendations, route planning, and relationship-heavy domains.

## Learning Approach

Retrieveler aims to make these structures easy to grasp by showing how each one fits different data types and retrieval patterns. The project emphasizes:

- recognizing which structure matches a given dataset
- comparing how retrieval works in each model
- practicing with concrete examples and intuitive visuals

## CSS Selector Learner

The CSS Selector Learner page is a hands-on session for understanding hierarchical data retrieval in the context of HTML.

What it is:

- an interactive example of a DOM-like tree structure
- a practice page for selecting nested elements by tag, class, id, and structural relationships
- a bridge between hierarchical data theory and real-world web development

How to use it:

- start by examining the page structure and the nested HTML elements
- try choosing selectors that match children, descendants, siblings, and specific attributes
- compare how different selectors return different elements in the hierarchy

Learners can use this page to see how data retrieval works when the data is organized as a tree. It shows:

- how nested elements form a hierarchical data structure
- how CSS selectors can be used to retrieve specific nodes
- how structural relationships like parent/child and ancestor/descendant affect retrieval results

This session is designed to make hierarchical structure intuitive by letting learners explore and practice on a real HTML document model.

## Why this project matters

Understanding these three data structures is essential for anyone working with data retrieval, because each structure shapes how data is stored, searched, and joined.

Retrieveler is intended as a learning companion for developers, students, and anyone who wants to understand data retrieval patterns clearly and intuitively.
