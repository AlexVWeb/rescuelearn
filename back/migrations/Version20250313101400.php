<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250313101400 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE category_question (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE category_question_question (category_question_id INT NOT NULL, question_id INT NOT NULL, INDEX IDX_3FAF83C2A9BCB4D4 (category_question_id), INDEX IDX_3FAF83C21E27F6BF (question_id), PRIMARY KEY(category_question_id, question_id)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE level_question (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE question (id INT AUTO_INCREMENT NOT NULL, quiz_id INT NOT NULL, level_id INT DEFAULT NULL, text LONGTEXT NOT NULL, correct_answer VARCHAR(1) NOT NULL, explanation LONGTEXT DEFAULT NULL, INDEX IDX_B6F7494E853CD175 (quiz_id), INDEX IDX_B6F7494E5FB14BA7 (level_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE question_option (id INT AUTO_INCREMENT NOT NULL, question_id INT NOT NULL, text VARCHAR(255) NOT NULL, option_id VARCHAR(10) DEFAULT NULL, INDEX IDX_5DDB2FB81E27F6BF (question_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE quiz (id INT AUTO_INCREMENT NOT NULL, title VARCHAR(255) NOT NULL, time_per_question INT NOT NULL, passing_score INT NOT NULL, mode_random TINYINT(1) DEFAULT 0 NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE user (id INT AUTO_INCREMENT NOT NULL, email VARCHAR(180) NOT NULL, roles JSON NOT NULL COMMENT \'(DC2Type:json)\', password VARCHAR(255) NOT NULL, UNIQUE INDEX UNIQ_IDENTIFIER_EMAIL (email), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE messenger_messages (id BIGINT AUTO_INCREMENT NOT NULL, body LONGTEXT NOT NULL, headers LONGTEXT NOT NULL, queue_name VARCHAR(190) NOT NULL, created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', available_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', delivered_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_75EA56E0FB7336F0 (queue_name), INDEX IDX_75EA56E0E3BD61CE (available_at), INDEX IDX_75EA56E016BA31DB (delivered_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE category_question_question ADD CONSTRAINT FK_3FAF83C2A9BCB4D4 FOREIGN KEY (category_question_id) REFERENCES category_question (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE category_question_question ADD CONSTRAINT FK_3FAF83C21E27F6BF FOREIGN KEY (question_id) REFERENCES question (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE question ADD CONSTRAINT FK_B6F7494E853CD175 FOREIGN KEY (quiz_id) REFERENCES quiz (id)');
        $this->addSql('ALTER TABLE question ADD CONSTRAINT FK_B6F7494E5FB14BA7 FOREIGN KEY (level_id) REFERENCES level_question (id)');
        $this->addSql('ALTER TABLE question_option ADD CONSTRAINT FK_5DDB2FB81E27F6BF FOREIGN KEY (question_id) REFERENCES question (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE category_question_question DROP FOREIGN KEY FK_3FAF83C2A9BCB4D4');
        $this->addSql('ALTER TABLE category_question_question DROP FOREIGN KEY FK_3FAF83C21E27F6BF');
        $this->addSql('ALTER TABLE question DROP FOREIGN KEY FK_B6F7494E853CD175');
        $this->addSql('ALTER TABLE question DROP FOREIGN KEY FK_B6F7494E5FB14BA7');
        $this->addSql('ALTER TABLE question_option DROP FOREIGN KEY FK_5DDB2FB81E27F6BF');
        $this->addSql('DROP TABLE category_question');
        $this->addSql('DROP TABLE category_question_question');
        $this->addSql('DROP TABLE level_question');
        $this->addSql('DROP TABLE question');
        $this->addSql('DROP TABLE question_option');
        $this->addSql('DROP TABLE quiz');
        $this->addSql('DROP TABLE user');
        $this->addSql('DROP TABLE messenger_messages');
    }
}
