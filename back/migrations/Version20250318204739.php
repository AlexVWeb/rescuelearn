<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250318204739 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE category_question_quiz (category_question_id INT NOT NULL, quiz_id INT NOT NULL, INDEX IDX_E4273236A9BCB4D4 (category_question_id), INDEX IDX_E4273236853CD175 (quiz_id), PRIMARY KEY(category_question_id, quiz_id)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE category_question_quiz ADD CONSTRAINT FK_E4273236A9BCB4D4 FOREIGN KEY (category_question_id) REFERENCES category_question (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE category_question_quiz ADD CONSTRAINT FK_E4273236853CD175 FOREIGN KEY (quiz_id) REFERENCES quiz (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE category_question_question DROP FOREIGN KEY FK_3FAF83C2A9BCB4D4');
        $this->addSql('ALTER TABLE category_question_question DROP FOREIGN KEY FK_3FAF83C21E27F6BF');
        $this->addSql('DROP TABLE category_question_question');
        $this->addSql('ALTER TABLE question DROP FOREIGN KEY FK_B6F7494E5FB14BA7');
        $this->addSql('DROP INDEX IDX_B6F7494E5FB14BA7 ON question');
        $this->addSql('ALTER TABLE question DROP level_id');
        $this->addSql('ALTER TABLE quiz ADD level_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE quiz ADD CONSTRAINT FK_A412FA925FB14BA7 FOREIGN KEY (level_id) REFERENCES level_question (id)');
        $this->addSql('CREATE INDEX IDX_A412FA925FB14BA7 ON quiz (level_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE category_question_question (category_question_id INT NOT NULL, question_id INT NOT NULL, INDEX IDX_3FAF83C2A9BCB4D4 (category_question_id), INDEX IDX_3FAF83C21E27F6BF (question_id), PRIMARY KEY(category_question_id, question_id)) DEFAULT CHARACTER SET utf8mb3 COLLATE `utf8mb3_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('ALTER TABLE category_question_question ADD CONSTRAINT FK_3FAF83C2A9BCB4D4 FOREIGN KEY (category_question_id) REFERENCES category_question (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE category_question_question ADD CONSTRAINT FK_3FAF83C21E27F6BF FOREIGN KEY (question_id) REFERENCES question (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE category_question_quiz DROP FOREIGN KEY FK_E4273236A9BCB4D4');
        $this->addSql('ALTER TABLE category_question_quiz DROP FOREIGN KEY FK_E4273236853CD175');
        $this->addSql('DROP TABLE category_question_quiz');
        $this->addSql('ALTER TABLE quiz DROP FOREIGN KEY FK_A412FA925FB14BA7');
        $this->addSql('DROP INDEX IDX_A412FA925FB14BA7 ON quiz');
        $this->addSql('ALTER TABLE quiz DROP level_id');
        $this->addSql('ALTER TABLE question ADD level_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE question ADD CONSTRAINT FK_B6F7494E5FB14BA7 FOREIGN KEY (level_id) REFERENCES level_question (id)');
        $this->addSql('CREATE INDEX IDX_B6F7494E5FB14BA7 ON question (level_id)');
    }
}
