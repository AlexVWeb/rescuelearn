<?php

namespace App\Controller\Admin;

use App\Entity\CategoryQuestion;
use App\Entity\LevelQuestion;
use App\Entity\Question;
use App\Entity\QuestionOption;
use App\Entity\Quiz;
use App\Form\QuestionType;
use App\Form\QuizImportType;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class QuizCrudController extends AbstractCrudController
{
    private $entityManager;
    private $adminUrlGenerator;

    public function __construct(EntityManagerInterface $entityManager, AdminUrlGenerator $adminUrlGenerator)
    {
        $this->entityManager = $entityManager;
        $this->adminUrlGenerator = $adminUrlGenerator;
    }

    public static function getEntityFqcn(): string
    {
        return Quiz::class;
    }

    public function configureActions(Actions $actions): Actions
    {
        $importQuiz = Action::new('importQuiz', 'Importer un quiz')
            ->setIcon('fa fa-file-import')
            ->linkToCrudAction('importQuiz')
            ->addCssClass('btn btn-primary')
            ->createAsGlobalAction();

        return $actions
            ->add(Crud::PAGE_INDEX, $importQuiz)
            ->update(Crud::PAGE_INDEX, Action::NEW, function (Action $action) {
                return $action->setIcon('fa fa-plus')->setLabel('Ajouter un quiz');
            })
            ->update(Crud::PAGE_INDEX, Action::DELETE, function (Action $action) {
                return $action->setIcon('fa fa-trash');
            })
            ->update(Crud::PAGE_INDEX, Action::EDIT, function (Action $action) {
                return $action->setIcon('fa fa-edit');
            })
            ->update(Crud::PAGE_INDEX, Action::BATCH_DELETE, function (Action $action) {
                return $action->setIcon('fa fa-trash-alt');
            })
            ->reorder(Crud::PAGE_INDEX, ['importQuiz', Action::NEW, Action::EDIT, Action::DELETE]);
    }

    public function configureFields(string $pageName): iterable
    {
        yield FormField::addPanel('Informations générales');
        yield TextField::new('title', 'Titre');
        yield IntegerField::new('timePerQuestion', 'Temps par question (sec)');
        yield IntegerField::new('passingScore', 'Score de réussite (%)');
        yield BooleanField::new('modeRandom', 'Mode aléatoire');
        
        yield FormField::addPanel('Questions');
        yield CollectionField::new('questions', 'Questions')
            ->setEntryType(QuestionType::class)
            ->allowAdd()
            ->allowDelete()
            ->setFormTypeOption('by_reference', false);
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setPageTitle('index', 'Quiz')
            ->setPageTitle('new', 'Créer un quiz')
            ->setPageTitle('edit', 'Modifier le quiz')
            ->setPageTitle('detail', 'Détails du quiz')
            ->setDefaultSort(['title' => 'ASC']);
    }

    public function importQuiz(Request $request): Response
    {
        $form = $this->createForm(QuizImportType::class);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();
            $json = json_decode($data['json'], true);

            if (json_last_error() === JSON_ERROR_NONE) {
                try {
                    $quiz = new Quiz();
                    $quiz->setTitle($json['title']);
                    $quiz->setTimePerQuestion($json['timePerQuestion']);
                    $quiz->setPassingScore($json['passingScore']);
                    $quiz->setModeRandom($json['modeRandom']);

                    // Détecter le niveau global et les catégories globales du quiz
                    $quizLevel = null;
                    $quizCategories = [];

                    if (isset($json['level'])) {
                        $levelName = $json['level'];
                        $level = $this->entityManager->getRepository(LevelQuestion::class)
                            ->findOneBy(['name' => $levelName]);
                        
                        if (!$level) {
                            $level = new LevelQuestion();
                            $level->setName($levelName);
                            $this->entityManager->persist($level);
                        }
                        $quizLevel = $level;
                    }

                    if (isset($json['categories']) && is_array($json['categories'])) {
                        foreach ($json['categories'] as $categoryName) {
                            $category = $this->entityManager->getRepository(CategoryQuestion::class)
                                ->findOneBy(['name' => $categoryName]);
                            
                            if (!$category) {
                                $category = new CategoryQuestion();
                                $category->setName($categoryName);
                                $this->entityManager->persist($category);
                            }
                            $quizCategories[] = $category;
                        }
                    }

                    // Assigner le niveau au quiz s'il existe
                    if ($quizLevel) {
                        $quiz->setLevel($quizLevel);
                    }

                    // Assigner les catégories au quiz s'il y en a
                    foreach ($quizCategories as $category) {
                        $quiz->addCategoryQuestion($category);
                    }

                    // Parcours des questions
                    foreach ($json['questions'] as $questionData) {
                        $question = new Question();
                        $question->setText($questionData['question']);
                        $question->setCorrectAnswer($questionData['correctAnswer']);
                        $question->setExplanation($questionData['explanation']);
                        $question->setQuiz($quiz);

                        foreach ($questionData['options'] as $optionData) {
                            $option = new QuestionOption();
                            $option->setText($optionData);
                            $option->setQuestion($question);
                            $this->entityManager->persist($option);
                        }

                        $this->entityManager->persist($question);
                    }

                    $this->entityManager->persist($quiz);
                    $this->entityManager->flush();

                    $this->addFlash('success', 'Le quiz a été importé avec succès !');
                    
                    return $this->redirect($this->adminUrlGenerator
                        ->setController(self::class)
                        ->setAction(Action::INDEX)
                        ->generateUrl()
                    );
                } catch (\Exception $e) {
                    error_log('Erreur lors de l\'import : ' . $e->getMessage());
                    error_log('Trace : ' . $e->getTraceAsString());
                    $this->addFlash('danger', 'Une erreur est survenue lors de l\'import : ' . $e->getMessage());
                }
            } else {
                error_log('Erreur de décodage JSON : ' . json_last_error_msg());
                $this->addFlash('danger', 'Le JSON fourni n\'est pas valide.');
            }
        }

        return $this->render('admin/quiz/import.html.twig', [
            'form' => $form->createView(),
            'page_title' => 'Importer un quiz'
        ]);
    }
} 