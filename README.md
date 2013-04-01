#Moderated Chatroom/Liveblog

###A simple self-hosted moderated chat room in PHP and JavaScript with automatic embedding of links, images, and YouTube videos.

This project aims to create a hostable moderated chat room using MySQL for storage, PHP for database interaction, Ajax for content updates, and JavaScript for client-side functionality. The user page is protected from spam by a reCAPTCHA form, and the moderator page uses simple password authentication.

The project uses two tables in a database. One table contains the "raw" feed, that is item submitted by users that need to undergo moderator approval, and the other table contains the "filtered" feed, which is items that have been approved.

When a user submits a comment, it is added to the "raw" table. Ajax running on any active moderator page will pick up on the comment, and add it to the mod-page's raw feed. Once it's there the moderator can edit the content if need be, and also approve the item. If a comment is approved it is added to the "filtered" table and Ajax running on both the mod and user pages will add that item to their filtered feeds. The item will also be removed from any active moderator's raw feed, and there are precautions in place to prevent an item from displaying twice if simultaneously approved by multiple mods. Comments made directly by moderators do not need approval, and will go straight into the "filtered" feed.

The database tables use an auto-incrementing ID column as the Primary Key, and this is the only field ever used for filtering to maximize database effeciancy. The InnoDB database engine is used for both tables as it is the most efficiant for handling concurrent reads and writes.

All submitted comments are parsed for content formatted like a URL. If such content is found, it will be treated in one of three ways:

* If the URL is a YouTube video, it will be embedded into the content using an IFRAME tag
* If the URL is an image, it will be embedded using an IMG tag (jpeg, gif, and png are supported)
* In all other cases, the URL will be converted to a simple link and inserted as such

Any attempts to embed HTML content directly will be escaped for security purposes.

##Future goals

I'd like to build this as an easy install plugin for popular content management systems, starting with WordPress and also potentially Drupal and Joomla.

I'd also like to explore the possibility of creating an application like this using node.js and socket.io for push notifications instead of relying on constant Ajax calls as it currently does.
